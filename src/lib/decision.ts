import { absd, bsd, pmt } from './calc';
import { CPF_OA_RATE, type BuyerProfile } from './rules';

/** All scenarios start at the same move-in date with identical cash and CPF.
 * The common monthly budget is the maximum cash housing outlay across scenarios;
 * unused cash is invested. CPF cannot be invested in the liquid portfolio.
 */
export interface DecisionInputs {
  price: number; buyerProfile: BuyerProfile; downPaymentPct: number;
  loanRate: number; loanYears: number; cpfInitial: number; cpfMonthly: number;
  rent: number; rentGrowth: number; priceGrowth: number; investmentReturn: number;
  holdingMonthly: number; holdingGrowth: number; horizonYears: number;
  buyLegal: number; sellLegal: number; agentPct: number; delayedYears: number;
}
export const DECISION_DEFAULTS: DecisionInputs = {
  price: 1_000_000, buyerProfile: 'SPR', downPaymentPct: 25, loanRate: 2,
  loanYears: 25, cpfInitial: 67_358, cpfMonthly: 1_680,
  rent: 3_500, rentGrowth: 2, priceGrowth: 1, investmentReturn: 5,
  holdingMonthly: 625, holdingGrowth: 2, horizonYears: 10,
  buyLegal: 3_000, sellLegal: 3_000, agentPct: 2, delayedYears: 1,
};
export interface DecisionResult {
  label: string; netWorth: number; liquidPortfolio: number; cpfOA: number;
  propertyEquity: number; homeValue: number; loanBalance: number;
  cashRequired: number; acquisitionCost: number; totalRent: number;
}
interface State {
  portfolio: number; oa: number; loan: number; home: number;
  paidCash: number; acquired: boolean; installment: number;
  loanAge: number; totalRent: number; cashRequired: number; acquisitionCost: number;
}
const growth = (annualPct: number) => Math.pow(1 + annualPct / 100, 1 / 12);
export function compareThreeWays(i: DecisionInputs): DecisionResult[] {
  const months = Math.round(i.horizonYears * 12);
  const delay = Math.round(i.delayedYears * 12);
  if (months <= 0 || delay >= months || delay < 0) throw new Error('Invalid comparison horizon or delay');
  const down = i.downPaymentPct / 100;
  const interest = i.loanRate / 1200;
  const invFactor = growth(i.investmentReturn);
  const oaFactor = growth(CPF_OA_RATE * 100);
  const rentFactor = growth(i.rentGrowth);
  const priceFactor = growth(i.priceGrowth);
  const holdFactor = growth(i.holdingGrowth);
  const names = ['立即买房', '一直租房并投资', '先租再买'];
  const s: State[] = names.map(() => ({
    portfolio: 0, oa: i.cpfInitial, loan: 0, home: 0, paidCash: 0,
    acquired: false, installment: 0, loanAge: 0, totalRent: 0,
    cashRequired: 0, acquisitionCost: 0,
  }));
  // First determine all upfront cash obligations with CPF allocated to down payment.
  // Seed identical liquid wealth sufficient for the largest acquisition cash requirement.
  const upfront = (price: number) => price * down + bsd(price) +
    absd(price, i.buyerProfile, 1) + i.buyLegal - Math.min(i.cpfInitial, Math.max(0, price * down - price * 0.05));
  const startingCash = Math.max(upfront(i.price), 0);
  for (const st of s) st.portfolio = startingCash;
  const costs: number[][] = names.map(() => Array(months).fill(0));
  // Pass 1: calculate month-by-month cash housing outlays, with OA withdrawals.
  for (let m = 0; m < months; m++) {
    const marketRent = i.rent * Math.pow(rentFactor, m);
    for (let k = 0; k < s.length; k++) {
      const st = s[k];
      st.oa += i.cpfMonthly;
      const buyMonth = k === 0 ? 0 : k === 2 ? delay : -1;
      if (m === buyMonth) {
        const price = i.price * Math.pow(priceFactor, m);
        const equity = price * down;
        const minCash = price * 0.05;
        const cpfUsed = Math.min(st.oa, Math.max(0, equity - minCash));
        st.oa -= cpfUsed;
        const acquisitionCost = bsd(price) + absd(price, i.buyerProfile, 1) + i.buyLegal;
        const cash = equity - cpfUsed + acquisitionCost;
        costs[k][m] += cash;
        st.cashRequired = cash;
        st.acquisitionCost = acquisitionCost;
        st.home = price;
        st.loan = price - equity;
        st.installment = pmt(st.loan, interest, i.loanYears * 12);
        st.acquired = true;
      }
      if (!st.acquired) {
        costs[k][m] += marketRent;
        st.totalRent += marketRent;
      } else {
        const due = Math.min(st.installment, st.loan * (1 + interest));
        const cpfUsed = Math.min(st.oa, due);
        st.oa -= cpfUsed;
        costs[k][m] += due - cpfUsed;
        st.loan = Math.max(0, st.loan * (1 + interest) - due);
        st.loanAge++;
        const holding = i.holdingMonthly * Math.pow(holdFactor, m - buyMonth);
        costs[k][m] += holding;
        st.home *= priceFactor;
      }
      st.oa *= oaFactor;
    }
  }
  // Pass 2: same monthly cash budget, with differences invested at the same rate.
  for (let m = 0; m < months; m++) {
    const budget = Math.max(...costs.map(c => c[m]));
    for (let k = 0; k < s.length; k++) {
      // The purchase month's large outlay is funded by starting cash, not an
      // imaginary recurring salary. Compare initial capital separately.
      const spend = costs[k][m];
      s[k].portfolio = s[k].portfolio * invFactor + budget - spend;
    }
  }
  return s.map((st, k) => {
    const sellingCosts = st.acquired ? st.home * i.agentPct / 100 + i.sellLegal : 0;
    const propertyEquity = st.acquired ? st.home - st.loan - sellingCosts : 0;
    return { label: names[k], netWorth: st.portfolio + st.oa + propertyEquity,
      liquidPortfolio: st.portfolio, cpfOA: st.oa, propertyEquity,
      homeValue: st.home, loanBalance: st.loan, cashRequired: st.cashRequired,
      acquisitionCost: st.acquisitionCost, totalRent: st.totalRent };
  });
}
