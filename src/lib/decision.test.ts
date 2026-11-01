import { describe, expect, it } from 'vitest';
import { compareThreeWays, DECISION_DEFAULTS } from './decision';
describe('three-way housing decision', () => {
 it('all three scenarios return finite balances', () => {
   const r=compareThreeWays(DECISION_DEFAULTS);
   expect(r).toHaveLength(3);
   for(const x of r) expect(Number.isFinite(x.netWorth)).toBe(true);
 });
 it('rent-only retains CPF and never owns a property', () => {
   const r=compareThreeWays(DECISION_DEFAULTS)[1];
   expect(r.propertyEquity).toBe(0);
   expect(r.cpfOA).toBeGreaterThan(DECISION_DEFAULTS.cpfInitial);
 });
 it('delayed buyer pays rent while waiting and has a mortgage', () => {
   const r=compareThreeWays(DECISION_DEFAULTS)[2];
   expect(r.totalRent).toBeGreaterThan(0);
   expect(r.loanBalance).toBeGreaterThan(0);
 });
});
