import { useMemo, useState } from 'react';
import { compareThreeWays, DECISION_DEFAULTS, type DecisionInputs } from '../lib/decision';
import { money } from '../lib/format';

export function HousingDecision() {
  const [v, setV] = useState<DecisionInputs>(DECISION_DEFAULTS);
  const update = (key: keyof DecisionInputs, value: number) => setV(p => ({ ...p, [key]: value }));
  const result = useMemo(() => compareThreeWays(v), [v]);
  const max = Math.max(...result.map(x => x.netWorth));
  const fields: Array<[keyof DecisionInputs, string, number]> = [
    ['price','房价 SGD',10000], ['cpfInitial','CPF OA 余额',1000],
    ['cpfMonthly','CPF OA 月缴存',100], ['rent','独居首年月租',100],
    ['priceGrowth','房价年涨幅 %',0.5], ['rentGrowth','租金年涨幅 %',0.5],
    ['investmentReturn','投资年化 %',0.5], ['loanRate','贷款利率 %',0.1],
    ['loanYears','贷款年限',1], ['holdingMonthly','每月持有成本',25],
    ['holdingGrowth','持有成本年涨幅 %',0.5], ['delayedYears','延迟买房年数',1],
  ];
  return <section className="rounded-xl border border-line bg-surface p-5 space-y-4">
    <div><h2 className="text-lg font-semibold">独居决策 · 三方案对比</h2>
    <p className="text-sm text-ink-3">以2027年6月独居开始为第0个月；此前合租开销相同，不影响方案差额。默认比较至2037年6月。</p></div>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {fields.map(([key,label,step]) => <label key={key} className="text-xs text-ink-2">{label}
        <input className="mt-1 w-full rounded border border-line bg-surface p-2 text-sm" type="number"
          step={step} value={v[key] as number} onChange={e => update(key, Number(e.target.value))}/></label>)}
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      {result.map(r => <div key={r.label} className="rounded-lg border border-line p-3">
        <div className="text-sm text-ink-2">{r.label}</div>
        <div className="text-xl font-semibold">{money(r.netWorth)}</div>
        <div className="text-xs text-ink-3">相对最优：{money(r.netWorth-max)}</div>
        <div className="mt-2 text-xs text-ink-3">房产净值 {money(r.propertyEquity)} · 投资 {money(r.liquidPortfolio)} · CPF {money(r.cpfOA)}</div>
      </div>)}
    </div>
    <p className="text-xs text-ink-3">假设PR首套、首付25%、贷款25年、买房法律费S$3,000、卖房中介2%和法律费S$3,000。房价涨幅已包含地契变化。所有方案拥有相同初始现金与CPF，逐月使用相同现金预算，闲置现金按投资收益率增长。未计装修、维修、租赁押金、SSD（默认持有超过4年）、税率变化及再融资。模型是确定性情景分析，不是预测。</p>
  </section>;
}
