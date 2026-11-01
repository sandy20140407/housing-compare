import { describe, expect, it } from 'vitest';
import { DEFAULT_INPUTS, absd, annualizedIrr, bsd, pmt, sensitivity, simulate, ssdRate, type Inputs } from './calc';
import { leaseValueFactor, FREEHOLD } from './rules';

const inputs = (o: Partial<Inputs> = {}): Inputs => ({ ...DEFAULT_INPUTS, ...o });

describe('BSD', () => {
  it.each([
    [180_000, 1_800],
    [1_000_000, 24_600],
    [2_000_000, 69_600],
    [4_000_000, 179_600],
  ])('bsd(%i) = %i', (price, expected) => {
    expect(bsd(price)).toBeCloseTo(expected, 6);
  });
});

describe('ABSD', () => {
  it('SC 首套为 0，SPR 第三套 35%，外国人 60%', () => {
    expect(absd(2_000_000, 'SC', 1)).toBe(0);
    expect(absd(2_000_000, 'SC', 2)).toBe(400_000);
    expect(absd(2_000_000, 'SPR', 3)).toBe(700_000);
    expect(absd(2_000_000, 'FOREIGNER', 1)).toBe(1_200_000);
  });
});

describe('SSD（2025-07-04 起，4 年持有期）', () => {
  it.each([
    [6, 0.16],
    [12, 0.12],
    [24, 0.08],
    [36, 0.04],
    [47, 0.04],
    [48, 0],
    [120, 0],
  ])('持有 %i 个月 → %f', (months, rate) => {
    expect(ssdRate(months)).toBe(rate);
  });
});

describe('pmt', () => {
  it('1.5M / 3% / 30 年', () => {
    expect(pmt(1_500_000, 0.03 / 12, 360)).toBeCloseTo(6324.06, 1);
  });
  it('零利率退化为本金均摊', () => {
    expect(pmt(1_200, 0, 12)).toBe(100);
  });
});

describe('annualizedIrr', () => {
  it('一年后 100 → 110 约为 10%', () => {
    const flows = [-100, ...Array(11).fill(0), 110];
    expect(annualizedIrr(flows)!).toBeCloseTo(0.1, 4);
  });
  it('全是流出时无解', () => {
    expect(annualizedIrr([-1, -1, -1])).toBeNull();
  });
});

describe('地契系数', () => {
  it('单调递减，永久地契为 1', () => {
    expect(leaseValueFactor(FREEHOLD)).toBe(1);
    expect(leaseValueFactor(99)).toBeGreaterThan(leaseValueFactor(80));
    expect(leaseValueFactor(80)).toBeGreaterThan(leaseValueFactor(40));
    expect(leaseValueFactor(0)).toBe(0);
  });
});

describe('simulate', () => {
  it('零利率零回报的二手房：净资产差 = 累计租金 − BSD', () => {
    const i = inputs({
      isNewLaunch: false,
      loanRate: 0,
      appreciation: 0,
      leaseRemaining: FREEHOLD,
      investmentReturn: 0,
      rentIncrease: 0,
      useCPF: false,
      cpfOABalance: 0,
      cpfOAMonthly: 0,
      propertyTaxMonthly: 0,
      maintenanceMonthly: 0,
      insuranceMonthly: 0,
      buyLegalFee: 0,
      sellLegalFee: 0,
      agentFeePct: 0,
      horizonYears: 10,
    });
    const res = simulate(i);
    const diff = res.atHorizon.buyNetWorth - res.atHorizon.rentNetWorth;
    expect(diff).toBeCloseTo(120 * i.monthlyRent - bsd(i.price), 2);
  });

  it('二手房贷款期满后贷款余额为 0', () => {
    const res = simulate(inputs({ isNewLaunch: false, loanYears: 25, horizonYears: 30 }));
    expect(res.series[24].loanBalance).toBeLessThan(1);
  });

  it('楼花进度款合计 = 房价，贷款部分 = 贷款额，自付部分 = 首付', () => {
    const i = inputs({ isNewLaunch: true });
    const res = simulate(i);
    const sum = (k: 'amount' | 'fromLoan' | 'fromCash' | 'fromCpf') => res.stages.reduce((s, x) => s + x[k], 0);
    expect(sum('amount')).toBeCloseTo(i.price, 6);
    expect(sum('fromLoan')).toBeCloseTo(res.loanAmount, 6);
    expect(sum('fromCash') + sum('fromCpf')).toBeCloseTo(i.price * i.downPaymentPct / 100, 6);
    // 至少 5% 现金
    expect(sum('fromCash')).toBeGreaterThanOrEqual(i.price * 0.05 - 1e-6);
  });

  it('楼花建设期月供远低于交房后月供，但不为 0', () => {
    const res = simulate(inputs({ isNewLaunch: true }));
    expect(res.constructionAvgInstallment).toBeGreaterThan(0);
    expect(res.constructionAvgInstallment).toBeLessThan(res.monthly.installment);
  });

  it('3 年 TOP 后卖出要交 4% SSD；卖出时扣掉未付的 CSC 尾款', () => {
    const res = simulate(inputs({ isNewLaunch: true, constructionYears: 3, horizonYears: 3 }));
    const s = res.atHorizon;
    expect(s.ssd).toBeCloseTo(s.propertyValue * 0.04, 6);
    expect(s.unpaidToDeveloper).toBeCloseTo(DEFAULT_INPUTS.price * 0.15, 6);
    // 净值远小于房价：贷款和尾款都要扣
    expect(s.netEquity).toBeLessThan(DEFAULT_INPUTS.price * 0.5);
  });

  it('CPF 应计利息：退款额 ≥ 实际用掉的 CPF', () => {
    const res = simulate(inputs({ isNewLaunch: false, horizonYears: 10 }));
    expect(res.atHorizon.cpfRefundDue).toBeGreaterThan(res.upfrontCpf);
  });

  it('TDSR：收入低时报警', () => {
    const res = simulate(inputs({ monthlyIncome: 8_000 }));
    expect(res.tdsr!.ratio).toBeGreaterThan(0.55);
    expect(res.warnings.some((w) => w.includes('TDSR'))).toBe(true);
  });
});

describe('sensitivity', () => {
  it('按影响大小排序，默认参数下房价涨幅影响最大', () => {
    const s = sensitivity(DEFAULT_INPUTS);
    expect(s.rows[0].key).toBe('appreciation');
    const swing = (r: (typeof s.rows)[number]) => Math.max(Math.abs(r.lowDelta), Math.abs(r.highDelta));
    for (let i = 1; i < s.rows.length; i++) expect(swing(s.rows[i - 1])).toBeGreaterThanOrEqual(swing(s.rows[i]));
  });

  it('方向正确：房价涨得多利好买房，投资回报高利好租房', () => {
    const s = sensitivity(DEFAULT_INPUTS);
    const r = (k: string) => s.rows.find((x) => x.key === k)!;
    expect(r('appreciation').highDelta).toBeGreaterThan(0);
    expect(r('investmentReturn').highDelta).toBeLessThan(0);
    expect(r('loanRate').highDelta).toBeLessThan(0);
  });

  it('在打平点上，买房与租房净资产相等', () => {
    const s = sensitivity(DEFAULT_INPUTS);
    expect(s.breakevenAppreciation).not.toBeNull();
    const at = simulate({ ...DEFAULT_INPUTS, appreciation: s.breakevenAppreciation! }).atHorizon;
    expect(Math.abs(at.buyNetWorth - at.rentNetWorth)).toBeLessThan(2_000);
    const ir = simulate({ ...DEFAULT_INPUTS, investmentReturn: s.breakevenInvestmentReturn! }).atHorizon;
    expect(Math.abs(ir.buyNetWorth - ir.rentNetWorth)).toBeLessThan(2_000);
  });
});

describe('先出租', () => {
  const zero = inputs({
    isNewLaunch: false, loanRate: 0, appreciation: 0, leaseRemaining: FREEHOLD, investmentReturn: 0, rentIncrease: 0,
    useCPF: false, cpfOABalance: 0, cpfOAMonthly: 0, propertyTaxMonthly: 0, maintenanceMonthly: 0, insuranceMonthly: 0,
    buyLegalFee: 0, sellLegalFee: 0, agentFeePct: 0, horizonYears: 10, monthlyRent: 2_000,
    unitRent: 3_000, unitRentIncrease: 0, rentedPropertyTaxMonthly: 0, rentalTaxRate: 0, holdingCostIncrease: 0,
  });
  const gap = (i: Inputs) => { const s = simulate(i).atHorizon; return s.buyNetWorth - s.rentNetWorth; };

  it('rentOutYears = 0 时结果与原来一致', () => {
    expect(gap({ ...zero, rentOutYears: 0 })).toBeCloseTo(gap(zero), 6);
  });

  it('零利率零税时，出租 10 年多出 =（租金 − 中介费摊销 − 自己房租）× 120', () => {
    const diff = gap({ ...zero, rentOutYears: 10 }) - gap(zero);
    expect(diff).toBeCloseTo(120 * (3_000 - 3_000 / 24 - 2_000), 2);
  });

  it('所得税按（租金 × 85% − 利息）× 税率扣，非自住房产税更高', () => {
    const base = { ...zero, rentOutYears: 10 };
    const taxed = gap({ ...base, rentalTaxRate: 10 }) - gap(base);
    expect(taxed).toBeCloseTo(-120 * 3_000 * 0.85 * 0.1, 2);
    const pt = gap({ ...base, rentedPropertyTaxMonthly: 300 }) - gap(base);
    expect(pt).toBeCloseTo(-120 * 300, 2);
  });

  it('只出租 3 年：之后自住，累计租金净收入只算 36 个月', () => {
    const r = simulate({ ...zero, rentOutYears: 3 });
    expect(r.atHorizon.cumRentalNet).toBeCloseTo(36 * (3_000 - 125), 2);
  });
});

describe('持有成本增长', () => {
  const zero = inputs({
    isNewLaunch: false, loanRate: 0, appreciation: 0, leaseRemaining: FREEHOLD, investmentReturn: 0, rentIncrease: 0,
    useCPF: false, cpfOABalance: 0, cpfOAMonthly: 0, propertyTaxMonthly: 0, maintenanceMonthly: 100, insuranceMonthly: 0,
    buyLegalFee: 0, sellLegalFee: 0, agentFeePct: 0, horizonYears: 2, holdingCostIncrease: 0,
  });
  const gap = (i: Inputs) => { const s = simulate(i).atHorizon; return s.buyNetWorth - s.rentNetWorth; };

  it('首年按填写值，第 2 年起按年涨幅复利', () => {
    const diff = gap({ ...zero, holdingCostIncrease: 10 }) - gap(zero);
    expect(diff).toBeCloseTo(-12 * 100 * 0.1, 2);
  });

  it('出租期间的非自住房产税也随之增长', () => {
    const rented = { ...zero, maintenanceMonthly: 0, rentOutYears: 2, unitRent: 3_000, unitRentIncrease: 0, rentedPropertyTaxMonthly: 200, rentalTaxRate: 0 };
    const diff = gap({ ...rented, holdingCostIncrease: 10 }) - gap(rented);
    expect(diff).toBeCloseTo(-12 * 200 * 0.1, 2);
  });
});

describe('涨幅已含地契衰减', () => {
  it('打开后与永久地契的房产市值一致，不再额外扣衰减', () => {
    const base = inputs({ isNewLaunch: false, horizonYears: 10 });
    const included = simulate({ ...base, leaseRemaining: 60, appreciationIncludesLease: true }).atHorizon;
    const freehold = simulate({ ...base, leaseRemaining: FREEHOLD }).atHorizon;
    expect(included.propertyValue).toBeCloseTo(freehold.propertyValue, 6);
  });

  it('关闭时剩余地契越短，期末市值越低', () => {
    const base = inputs({ isNewLaunch: false, horizonYears: 10 });
    const short = simulate({ ...base, leaseRemaining: 60 }).atHorizon.propertyValue;
    const long = simulate({ ...base, leaseRemaining: 95 }).atHorizon.propertyValue;
    expect(short).toBeLessThan(long);
  });
});


describe('现金流校准回归', () => {
  it('不使用 CPF 买房时，两种方案仍收到相同 CPF 月缴存', () => {
    const i = inputs({ isNewLaunch: false, useCPF: false, cpfOABalance: 20_000, cpfOAMonthly: 1_000, horizonYears: 5 });
    const s = simulate(i).atHorizon;
    expect(s.buyOA).toBeCloseTo(s.rentOA, 6);
    expect(s.buyOA).toBeGreaterThan(20_000 + 60_000);
  });

  it('房产 IRR 在年末出售时不会额外延后一个月', () => {
    const i = inputs({ isNewLaunch: false, price: 1_000_000, downPaymentPct: 100, loanRate: 0,
      useCPF: false, cpfOABalance: 0, cpfOAMonthly: 0, appreciation: 0,
      appreciationIncludesLease: true, horizonYears: 1, monthlyRent: 0,
      propertyTaxMonthly: 0, maintenanceMonthly: 0, insuranceMonthly: 0,
      buyLegalFee: 0, sellLegalFee: 0, agentFeePct: 0 });
    const result = simulate(i);
    // Cash purchase at t=0 and sale at the end of month 12.
    // BSD is the only loss; the return is annualized over 11 month intervals
    // in the existing monthly cash-flow convention (first payment at index 0).
    const expected = annualizedIrr([-1_000_000 - bsd(1_000_000), ...Array(10).fill(0), 1_000_000]);
    expect(result.propertyIrr).toBeCloseTo(expected, 8);
  });
});
