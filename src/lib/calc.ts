/**
 * 买房 vs 租房：按月模拟的纯计算引擎（无 React 依赖，可单测）。
 *
 * 公平比较的口径：
 *  - 两种方案每月可支配的总预算相同 = max(买房当月支出, 租房当月支出)；
 *    支出更少的一方把差额按 investmentReturn 投资（买房方也可能是投资方）。
 *  - 第 0 个月买房的首付 + 税费，在租房方案里全部拿去投资。
 *  - 两边都有同样的 CPF OA 初始余额和月缴存；买房方用 OA 付首付 / 月供，
 *    租房方 OA 留在账户里按 2.5% 生息。
 *  - 净资产按「期末全部变现」计算：房产扣中介费、律师费、SSD、未付进度款、
 *    剩余贷款；CPF 退款（本金 + 应计利息）只是从卖房款转回 OA，不改变总净资产。
 */
import {
  ABSD_RATES,
  BSD_TIERS,
  BUC_SCHEDULE,
  CPF_OA_RATE,
  MIN_CASH_DOWN_PAYMENT,
  MIN_DOWN_PAYMENT_FIRST_LOAN,
  SSD_RATES,
  STRESS_TEST_RATE,
  TDSR_LIMIT,
  FREEHOLD,
  leaseValueFactor,
  type BuyerProfile,
} from './rules';

export interface Inputs {
  price: number;
  isNewLaunch: boolean;
  /** 楼花：签约到 TOP 的年数 */
  constructionYears: number;
  /** 楼花：建设期买方是否仍要租房住（自住买家通常是） */
  rentWhileWaiting: boolean;
  /** 首付比例 % */
  downPaymentPct: number;
  /** 贷款年利率 % */
  loanRate: number;
  loanYears: number;
  buyerProfile: BuyerProfile;
  /** 这是第几套住宅（1/2/3+），决定 ABSD */
  propertyIndex: 1 | 2 | 3;
  buyLegalFee: number;
  propertyTaxMonthly: number;
  maintenanceMonthly: number;
  insuranceMonthly: number;
  /** 房价年涨幅 %（不含地契衰减） */
  appreciation: number;
  /** 剩余地契年限；999 = 永久地契 */
  leaseRemaining: number;
  useCPF: boolean;
  cpfOABalance: number;
  cpfOAMonthly: number;
  monthlyRent: number;
  /** 租金年涨幅 % */
  rentIncrease: number;
  /** 投资年化回报 % */
  investmentReturn: number;
  /** 比较期 / 持有年限 */
  horizonYears: number;
  /** 卖房中介费 % */
  agentFeePct: number;
  sellLegalFee: number;
  /** 月收入（税前），0 = 不做 TDSR 检查 */
  monthlyIncome: number;
  otherDebtMonthly: number;
  /** 买入后先出租几年（楼花从 TOP 起算），期间自己继续租房住；0 = 直接自住 */
  rentOutYears: number;
  /** 本房出租的市场月租（首年） */
  unitRent: number;
  /** 本房租金年涨幅 % */
  unitRentIncrease: number;
  /** 出租期间的月房产税（非自住税率） */
  rentedPropertyTaxMonthly: number;
  /** 租金收入适用的边际所得税率 % */
  rentalTaxRate: number;
}

export const DEFAULT_INPUTS: Inputs = {
  price: 2_000_000,
  isNewLaunch: true,
  constructionYears: 3,
  rentWhileWaiting: true,
  downPaymentPct: 25,
  loanRate: 3,
  loanYears: 30,
  buyerProfile: 'SC',
  propertyIndex: 1,
  buyLegalFee: 3_000,
  propertyTaxMonthly: 250,
  maintenanceMonthly: 350,
  insuranceMonthly: 25,
  appreciation: 2.5,
  leaseRemaining: 99,
  useCPF: true,
  cpfOABalance: 100_000,
  cpfOAMonthly: 1_000,
  monthlyRent: 4_000,
  rentIncrease: 3,
  investmentReturn: 5,
  horizonYears: 10,
  agentFeePct: 2,
  sellLegalFee: 3_000,
  monthlyIncome: 0,
  otherDebtMonthly: 0,
  rentOutYears: 0,
  unitRent: 4_000,
  unitRentIncrease: 3,
  rentedPropertyTaxMonthly: 450,
  rentalTaxRate: 15,
};

/** 出租时可扣除的视同费用比例（IRAS：租金的 15%），中介费按每 2 年 1 个月租金摊销 */
const DEEMED_EXPENSE_RATE = 0.15;
const AGENT_MONTHS_PER_YEAR = 0.5;

// ---------------------------------------------------------------- 基础公式

export function bsd(price: number): number {
  let tax = 0;
  let lower = 0;
  for (const [upper, rate] of BSD_TIERS) {
    if (price <= lower) break;
    tax += (Math.min(price, upper) - lower) * rate;
    lower = upper;
  }
  return tax;
}

export function absd(price: number, profile: BuyerProfile, propertyIndex: 1 | 2 | 3): number {
  return price * ABSD_RATES[profile][propertyIndex - 1];
}

/**
 * 持有 monthsHeld 个月后卖出的 SSD 税率。
 * 视为在周年之后卖出：持有满 4 年（48 个月）→ 0%，满 3 年 → 4%。
 * 注意：严格按 IRAS 口径，恰好在周年当天卖出仍算上一档，实际操作要留出几天余量。
 */
export function ssdRate(monthsHeld: number): number {
  return SSD_RATES[Math.floor(monthsHeld / 12)] ?? 0;
}

/** 等额本息月供；利率为 0 时退化为本金均摊 */
export function pmt(principal: number, monthlyRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  if (monthlyRate === 0) return principal / months;
  const f = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * f) / (f - 1);
}

const toMonthly = (annualPct: number) => Math.pow(1 + annualPct / 100, 1 / 12) - 1;

/** 月度现金流的 IRR，年化返回；无解时返回 null */
export function annualizedIrr(flows: number[]): number | null {
  const npv = (r: number) => flows.reduce((s, f, i) => s + f / Math.pow(1 + r, i), 0);
  let lo = -0.99;
  let hi = 1;
  let fLo = npv(lo);
  const fHi = npv(hi);
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || fLo * fHi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-6) return Math.pow(1 + mid, 12) - 1;
    if (fLo * fMid < 0) hi = mid;
    else {
      lo = mid;
      fLo = fMid;
    }
  }
  return Math.pow(1 + (lo + hi) / 2, 12) - 1;
}

// ---------------------------------------------------------------- 模拟

export interface StagePayment {
  name: string;
  month: number;
  amount: number;
  fromCash: number;
  fromCpf: number;
  fromLoan: number;
}

export interface YearSnapshot {
  year: number;
  propertyValue: number;
  loanBalance: number;
  unpaidToDeveloper: number;
  ssd: number;
  sellingCosts: number;
  /** 变现后房产净值（已扣剩余贷款、未付进度款、卖房成本、SSD） */
  netEquity: number;
  /** 卖房时需退回 CPF 的本金 + 应计利息 */
  cpfRefundDue: number;
  buyPortfolio: number;
  buyOA: number;
  buyNetWorth: number;
  rentPortfolio: number;
  rentOA: number;
  rentNetWorth: number;
  /** 截至当年买房方累计投入（现金 + CPF） */
  cumBuyOutflow: number;
  cumRentOutflow: number;
  cumInterest: number;
  /** 截至当年累计租金净收入（先出租时） */
  cumRentalNet: number;
}

export interface MonthlyBreakdown {
  installment: number;
  fromCpf: number;
  fromCash: number;
  propertyTax: number;
  maintenance: number;
  insurance: number;
  total: number;
  cashTotal: number;
}

export interface Result {
  loanAmount: number;
  bsd: number;
  absd: number;
  /** 第 0 个月买房方需要的现金（含现金首付部分 + 税费 + 律师费） */
  upfrontCash: number;
  upfrontCpf: number;
  stages: StagePayment[];
  topMonth: number;
  /** 交房后（贷款全额放款后）的稳态月支出 */
  monthly: MonthlyBreakdown;
  /** 楼花建设期内平均月供（进度款放款部分） */
  constructionAvgInstallment: number;
  monthlyRent: number;
  series: YearSnapshot[];
  atHorizon: YearSnapshot;
  /** 纯房产投资 IRR（不计省下的租金），年化 */
  propertyIrr: number | null;
  /** 比较期内买房净资产首次超过租房的年份 */
  crossoverYear: number | null;
  tdsr: { ratio: number; stressInstallment: number } | null;
  warnings: string[];
}

const SERIES_YEARS = 30;

/** 持有 t 年后地契衰减带来的价值比例（永久地契为 1） */
export function leaseDecay(leaseRemaining: number, t: number): number {
  if (leaseRemaining >= FREEHOLD) return 1;
  const lf0 = leaseValueFactor(leaseRemaining);
  return lf0 > 0 ? leaseValueFactor(leaseRemaining - t) / lf0 : 0;
}

export function simulate(inp: Inputs): Result {
  const price = inp.price;
  const horizon = Math.max(1, Math.round(inp.horizonYears));
  const totalYears = Math.max(horizon, SERIES_YEARS);
  const N = totalYears * 12;

  const loanAmount = price * (1 - inp.downPaymentPct / 100);
  const equityRequired = price - loanAmount;
  const minCash = price * MIN_CASH_DOWN_PAYMENT;
  const r = inp.loanRate / 100 / 12;
  const tenureMonths = inp.loanYears * 12;
  const invM = toMonthly(inp.investmentReturn);
  const cpfM = toMonthly(CPF_OA_RATE * 100);

  const bsdAmt = bsd(price);
  const absdAmt = absd(price, inp.buyerProfile, inp.propertyIndex);

  // 付款节点（月份 → 金额）
  // TOP 落在建设期最后一个月，这样「持有 N 年」的年末快照已包含 TOP 付款
  const topMonth = inp.isNewLaunch ? Math.max(0, Math.round(inp.constructionYears * 12) - 1) : 0;
  const schedule = inp.isNewLaunch
    ? BUC_SCHEDULE.map((s) => ({
        name: s.name,
        month: Math.round(s.at * topMonth) + (s.monthsAfterTop ?? 0),
        amount: price * s.pct,
      }))
    : [{ name: '完成交易', month: 0, amount: price }];
  const lastStageMonth = Math.max(...schedule.map((s) => s.month));

  // 状态
  let loanBal = 0;
  let installment = 0;
  let tenureStart = -1;
  let equityPaid = 0;
  let cashEquityPaid = 0;
  let paidToDeveloper = 0;
  let cpfRefundDue = 0;
  let buyOA = inp.cpfOABalance;
  let rentOA = inp.cpfOABalance;
  let buyPf = 0;
  let rentPf = 0;
  let rent = inp.monthlyRent;
  let unitRent = inp.unitRent;
  const rentOutMonths = Math.max(0, Math.round(inp.rentOutYears * 12));
  let cumRentalNet = 0;
  let cumBuy = 0;
  let cumRent = 0;
  let cumInterest = 0;
  let upfrontCash = 0;
  let upfrontCpf = 0;
  let constructionInstSum = 0;
  let constructionInstCount = 0;
  let installmentAfterCompletion = 0;

  const stages: StagePayment[] = [];
  const series: YearSnapshot[] = [];
  const propertyFlows: number[] = [];

  for (let m = 0; m < N; m++) {
    if (m > 0 && m % 12 === 0) {
      rent *= 1 + inp.rentIncrease / 100;
      unitRent *= 1 + inp.unitRentIncrease / 100;
    }
    let monthInterest = 0;

    if (inp.useCPF) {
      buyOA += inp.cpfOAMonthly;
    }
    rentOA += inp.cpfOAMonthly;

    let buyCash = 0;
    let buyCpf = 0;
    let propertyOut = 0;

    // 购入税费（现金支付；BSD 实际可用 CPF 报销，这里保守按现金）
    if (m === 0) {
      const fees = bsdAmt + absdAmt + inp.buyLegalFee;
      buyCash += fees;
      propertyOut += fees;
    }

    // 进度款 / 一次性成交
    for (const s of schedule) {
      if (s.month !== m) continue;
      const fromEquity = Math.min(s.amount, Math.max(0, equityRequired - equityPaid));
      const cashNeeded = Math.max(0, minCash - cashEquityPaid);
      let cashPart = Math.min(fromEquity, cashNeeded);
      let cpfPart = 0;
      if (inp.useCPF) cpfPart = Math.min(fromEquity - cashPart, buyOA);
      cashPart = fromEquity - cpfPart;
      const loanPart = s.amount - fromEquity;

      equityPaid += fromEquity;
      cashEquityPaid += cashPart;
      paidToDeveloper += s.amount;
      buyOA -= cpfPart;
      cpfRefundDue += cpfPart;
      buyCash += cashPart;
      buyCpf += cpfPart;
      propertyOut += fromEquity;

      if (loanPart > 0) {
        if (tenureStart < 0) tenureStart = m;
        loanBal += loanPart;
        const remaining = Math.max(1, tenureMonths - (m - tenureStart));
        installment = pmt(loanBal, r, remaining);
      }
      stages.push({ name: s.name, month: m, amount: s.amount, fromCash: cashPart, fromCpf: cpfPart, fromLoan: loanPart });
    }
    if (m === 0) {
      upfrontCash = buyCash;
      upfrontCpf = buyCpf;
    }

    // 月供
    if (loanBal > 0.005) {
      const interest = loanBal * r;
      const pay = Math.min(installment, loanBal + interest);
      loanBal = Math.max(0, loanBal - (pay - interest));
      cumInterest += interest;
      monthInterest = interest;
      const cpfPay = inp.useCPF ? Math.min(pay, buyOA) : 0;
      buyOA -= cpfPay;
      cpfRefundDue += cpfPay;
      buyCpf += cpfPay;
      buyCash += pay - cpfPay;
      propertyOut += pay;
      if (inp.isNewLaunch && m < topMonth) {
        constructionInstSum += pay;
        constructionInstCount++;
      }
      if (m === lastStageMonth) installmentAfterCompletion = installment;
    }

    // 持有成本 / 租金
    const moved = !inp.isNewLaunch || m >= topMonth;
    const rentedOut = moved && m - topMonth < rentOutMonths;
    if (rentedOut) {
      // 出租：按非自住税率交房产税；自己继续租房住；租金扣中介费摊销和所得税后为净收入
      const hold = inp.rentedPropertyTaxMonthly + inp.maintenanceMonthly + inp.insuranceMonthly;
      const agent = (unitRent * AGENT_MONTHS_PER_YEAR) / 12;
      const taxable = Math.max(0, unitRent * (1 - DEEMED_EXPENSE_RATE) - monthInterest);
      const net = unitRent - agent - taxable * (inp.rentalTaxRate / 100);
      buyCash += hold + rent - net;
      propertyOut += hold - net;
      cumRentalNet += net;
    } else if (moved) {
      const hold = inp.propertyTaxMonthly + inp.maintenanceMonthly + inp.insuranceMonthly;
      buyCash += hold;
      propertyOut += hold;
    } else if (inp.rentWhileWaiting) {
      buyCash += rent;
    }
    const rentCash = rent;

    // 同预算：花得少的一方把差额投资
    const budget = Math.max(buyCash, rentCash);
    buyPf = buyPf * (1 + invM) + (budget - buyCash);
    rentPf = rentPf * (1 + invM) + (budget - rentCash);

    buyOA *= 1 + cpfM;
    rentOA *= 1 + cpfM;
    cpfRefundDue *= 1 + cpfM;

    cumBuy += buyCash + buyCpf;
    cumRent += rentCash;
    propertyFlows.push(-propertyOut);

    // 年末快照（按当时全部变现）
    if ((m + 1) % 12 === 0) {
      const monthsHeld = m + 1;
      const t = monthsHeld / 12;
      const value = price * Math.pow(1 + inp.appreciation / 100, t) * leaseDecay(inp.leaseRemaining, t);
      const ssd = value * ssdRate(monthsHeld);
      const sellingCosts = value * (inp.agentFeePct / 100) + inp.sellLegalFee;
      const unpaid = Math.max(0, price - paidToDeveloper);
      const netEquity = value - sellingCosts - ssd - unpaid - loanBal;
      series.push({
        year: t,
        propertyValue: value,
        loanBalance: loanBal,
        unpaidToDeveloper: unpaid,
        ssd,
        sellingCosts,
        netEquity,
        cpfRefundDue,
        buyPortfolio: buyPf,
        buyOA,
        buyNetWorth: netEquity + buyPf + buyOA,
        rentPortfolio: rentPf,
        rentOA,
        rentNetWorth: rentPf + rentOA,
        cumBuyOutflow: cumBuy,
        cumRentOutflow: cumRent,
        cumInterest,
        cumRentalNet,
      });
    }
  }

  const atHorizon = series[horizon - 1];

  // 纯房产 IRR：只看投入房子的钱和卖房净回款
  const flows = propertyFlows.slice(0, horizon * 12);
  flows.push(atHorizon.netEquity);
  const propertyIrr = annualizedIrr(flows);

  const crossover = series.find((s) => s.year <= horizon && s.buyNetWorth >= s.rentNetWorth);

  // 稳态月支出（全额放款后）
  const fullInst = installmentAfterCompletion || pmt(loanAmount, r, tenureMonths);
  const monthlyCpf = inp.useCPF ? Math.min(inp.cpfOAMonthly, fullInst) : 0;
  const hold = inp.propertyTaxMonthly + inp.maintenanceMonthly + inp.insuranceMonthly;
  const monthly: MonthlyBreakdown = {
    installment: fullInst,
    fromCpf: monthlyCpf,
    fromCash: fullInst - monthlyCpf,
    propertyTax: inp.propertyTaxMonthly,
    maintenance: inp.maintenanceMonthly,
    insurance: inp.insuranceMonthly,
    total: fullInst + hold,
    cashTotal: fullInst - monthlyCpf + hold,
  };

  let tdsr: Result['tdsr'] = null;
  if (inp.monthlyIncome > 0) {
    const stressInstallment = pmt(loanAmount, Math.max(inp.loanRate / 100, STRESS_TEST_RATE) / 12, tenureMonths);
    tdsr = { stressInstallment, ratio: (stressInstallment + inp.otherDebtMonthly) / inp.monthlyIncome };
  }

  const warnings: string[] = [];
  if (inp.downPaymentPct / 100 < MIN_DOWN_PAYMENT_FIRST_LOAN) {
    warnings.push('首套房贷 LTV 上限 75%，首付至少 25%（其中至少 5% 现金）。');
  }
  if (inp.propertyIndex > 1) {
    warnings.push('如果已有未还清的房贷，第二笔 LTV 降到 45%、第三笔 35%，首付要求会大幅提高。');
  }
  if (inp.loanYears > 30) {
    warnings.push('私宅贷款期超过 30 年（或年龄 + 贷款期 > 65）时 LTV 降到 55%。');
  }
  if (tdsr && tdsr.ratio > TDSR_LIMIT) {
    warnings.push(`按 ${(STRESS_TEST_RATE * 100).toFixed(0)}% 压力利率，TDSR 为 ${(tdsr.ratio * 100).toFixed(0)}%，超过 55% 上限，贷不到这么多。`);
  }
  if (inp.leaseRemaining < 60) {
    warnings.push('剩余地契不足 60 年：CPF 可用额度受限，银行放贷也更严格。');
  }
  if (atHorizon.ssd > 0) {
    warnings.push(`第 ${horizon} 年卖出仍在 4 年 SSD 期内，需缴 SSD ${(ssdRate(horizon * 12) * 100).toFixed(0)}%。`);
  }

  return {
    loanAmount,
    bsd: bsdAmt,
    absd: absdAmt,
    upfrontCash,
    upfrontCpf,
    stages,
    topMonth,
    monthly,
    constructionAvgInstallment: constructionInstCount ? constructionInstSum / constructionInstCount : 0,
    monthlyRent: inp.monthlyRent,
    series,
    atHorizon,
    propertyIrr,
    crossoverYear: crossover ? crossover.year : null,
    tdsr,
    warnings,
  };
}

// ---------------------------------------------------------------- 敏感度

export interface SensitivityRow {
  key: keyof Inputs;
  label: string;
  lowLabel: string;
  highLabel: string;
  /** 参数调低 / 调高后，「买 − 租」差额相对基准的变化 */
  lowDelta: number;
  highDelta: number;
}

export interface Sensitivity {
  base: number;
  rows: SensitivityRow[];
  /** 打平所需的房价年涨幅 %（高于它买房更划算）；范围内无解为 null */
  breakevenAppreciation: number | null;
  /** 打平所需的投资回报率 %（高于它租房更划算）；范围内无解为 null */
  breakevenInvestmentReturn: number | null;
}

const gap = (inp: Inputs) => {
  const s = simulate(inp).atHorizon;
  return s.buyNetWorth - s.rentNetWorth;
};

/** 在 [lo, hi] 上找 f(x) = 0，要求 f 单调；无变号时返回 null */
function solve(f: (x: number) => number, lo: number, hi: number): number | null {
  let fLo = f(lo);
  const fHi = f(hi);
  if (fLo === 0) return lo;
  if (fLo * fHi > 0) return null;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const fMid = f(mid);
    if (Math.abs(hi - lo) < 0.005) return mid;
    if (fLo * fMid <= 0) hi = mid;
    else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

const fmtPct = (n: number) => `${Number(n.toFixed(2))}%`;

export function sensitivity(inp: Inputs): Sensitivity {
  const base = gap(inp);
  const rentStep = Math.max(100, Math.round((inp.monthlyRent * 0.1) / 100) * 100);
  const specs: Array<{ key: keyof Inputs; label: string; step: number; min: number; fmt: (v: number) => string }> = [
    { key: 'appreciation', label: '房价年涨幅', step: 1, min: -10, fmt: fmtPct },
    { key: 'loanRate', label: '贷款利率', step: 1, min: 0, fmt: fmtPct },
    { key: 'investmentReturn', label: '投资回报率', step: 1, min: 0, fmt: fmtPct },
    { key: 'monthlyRent', label: '首年月租', step: rentStep, min: 0, fmt: (v) => `$${v.toLocaleString('en-SG')}` },
    { key: 'rentIncrease', label: '租金年涨幅', step: 1, min: -10, fmt: fmtPct },
  ];

  const rows = specs
    .map(({ key, label, step, min, fmt }) => {
      const v = inp[key] as number;
      const lo = Math.max(min, v - step);
      const hi = v + step;
      return {
        key,
        label,
        lowLabel: fmt(lo),
        highLabel: fmt(hi),
        lowDelta: gap({ ...inp, [key]: lo }) - base,
        highDelta: gap({ ...inp, [key]: hi }) - base,
      };
    })
    .sort((a, b) => Math.max(Math.abs(b.lowDelta), Math.abs(b.highDelta)) - Math.max(Math.abs(a.lowDelta), Math.abs(a.highDelta)));

  return {
    base,
    rows,
    breakevenAppreciation: solve((x) => gap({ ...inp, appreciation: x }), -10, 15),
    breakevenInvestmentReturn: solve((x) => gap({ ...inp, investmentReturn: x }), 0, 25),
  };
}
