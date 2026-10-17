/**
 * 新加坡住宅相关规则常量。
 * 集中放在这里，政策变动时只改这一个文件（并更新 README 的「规则依据」）。
 *
 * 核对日期：2026-10
 */

export type BuyerProfile = 'SC' | 'SPR' | 'FOREIGNER';

/** 住宅 BSD 分级（IRAS，2023-02-15 起）：[该档上限, 税率] */
export const BSD_TIERS: ReadonlyArray<readonly [number, number]> = [
  [180_000, 0.01],
  [360_000, 0.02],
  [1_000_000, 0.03],
  [1_500_000, 0.04],
  [3_000_000, 0.05],
  [Infinity, 0.06],
];

/** ABSD（2023-04-27 起）。下标 0/1/2 = 第 1 / 2 / 3 套及以上 */
export const ABSD_RATES: Record<BuyerProfile, readonly [number, number, number]> = {
  SC: [0, 0.2, 0.3],
  SPR: [0.05, 0.3, 0.35],
  FOREIGNER: [0.6, 0.6, 0.6],
};

/**
 * SSD（2025-07-04 及之后购入的住宅）：持有期 4 年。
 * 下标 i = 持有满 i 年但不满 i+1 年。持有满 4 年起为 0。
 * 持有期从购入日（楼花为行使 OTP / 签 S&P 之日）起算，不是从 TOP 起算。
 */
export const SSD_RATES: readonly number[] = [0.16, 0.12, 0.08, 0.04];

/** CPF OA 利率，也是 CPF 用于买房的应计利息（accrued interest）利率 */
export const CPF_OA_RATE = 0.025;

/** TDSR 上限与 MAS 压力测试利率（私宅） */
export const TDSR_LIMIT = 0.55;
export const STRESS_TEST_RATE = 0.04;

/** 首套房贷 LTV 75%：首付至少 25%，其中至少 5% 现金 */
export const MIN_DOWN_PAYMENT_FIRST_LOAN = 0.25;
export const MIN_CASH_DOWN_PAYMENT = 0.05;

/**
 * 楼花（BUC）标准进度款（Housing Developers Rules 附表）。
 * at = 在建设期中的位置（0 = 签约，1 = TOP）；CSC 一般在 TOP 后约 1 年。
 * 各期时间点为均匀化的估计，实际以开发商施工进度为准。
 */
export interface PaymentStage {
  name: string;
  pct: number;
  at: number;
  /** 相对 TOP 的额外月数（仅 CSC 用） */
  monthsAfterTop?: number;
}

export const BUC_SCHEDULE: readonly PaymentStage[] = [
  { name: 'OTP 订金', pct: 0.05, at: 0 },
  { name: '签 S&P', pct: 0.15, at: 0 },
  { name: '地基完成', pct: 0.1, at: 0.15 },
  { name: '钢筋混凝土框架', pct: 0.1, at: 0.35 },
  { name: '隔墙', pct: 0.05, at: 0.5 },
  { name: '天花板', pct: 0.05, at: 0.6 },
  { name: '门窗 / 水电', pct: 0.05, at: 0.7 },
  { name: '停车场 / 道路 / 排水', pct: 0.05, at: 0.85 },
  { name: 'TOP', pct: 0.25, at: 1 },
  { name: 'CSC', pct: 0.15, at: 1, monthsAfterTop: 12 },
];

/**
 * 地契价值曲线（剩余年限 → 相当于永久地契价值的比例），
 * 按 SLA Bala's Table 的形状做的近似插值，仅用于估算地契衰减。
 */
const LEASE_CURVE: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [1, 0.038],
  [5, 0.15],
  [10, 0.26],
  [20, 0.42],
  [30, 0.56],
  [40, 0.67],
  [50, 0.76],
  [60, 0.825],
  [70, 0.875],
  [80, 0.915],
  [90, 0.945],
  [99, 0.96],
];

/** 永久地契（freehold / 999 年）用这个值表示 */
export const FREEHOLD = 999;

export function leaseValueFactor(yearsRemaining: number): number {
  if (yearsRemaining >= 99) return yearsRemaining >= FREEHOLD ? 1 : 0.96;
  if (yearsRemaining <= 0) return 0;
  for (let i = 1; i < LEASE_CURVE.length; i++) {
    const [x1, y1] = LEASE_CURVE[i];
    if (yearsRemaining <= x1) {
      const [x0, y0] = LEASE_CURVE[i - 1];
      return y0 + ((yearsRemaining - x0) / (x1 - x0)) * (y1 - y0);
    }
  }
  return 0.96;
}
