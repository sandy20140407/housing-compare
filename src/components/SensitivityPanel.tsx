import type { Sensitivity } from '../lib/calc';
import { money } from '../lib/format';

const signed = (n: number) => `${n >= 0 ? '+' : '−'}${money(Math.abs(n))}`;

/** 以中线为 0 的双向条：右（买房更划算）蓝，左（租房更划算）橙 */
function Bar({ value, max }: { value: number; max: number }) {
  const w = max > 0 ? Math.min(50, (Math.abs(value) / max) * 50) : 0;
  return (
    <div className="relative h-2.5 w-full rounded-full bg-surface-2">
      <div className="absolute inset-y-0 left-1/2 w-px bg-line" />
      <div
        className={`absolute inset-y-0 rounded-full ${value >= 0 ? 'bg-buy' : 'bg-rent'}`}
        style={value >= 0 ? { left: '50%', width: `${w}%` } : { right: '50%', width: `${w}%` }}
      />
    </div>
  );
}

function Breakeven({ label, value, current, higherFavors, base }: { label: string; value: number | null; current: number; higherFavors: '买房' | '租房'; base: number }) {
  if (value === null) {
    // 在搜索范围内不变号：结论不随该参数改变
    const winner = base >= 0 ? '买房' : '租房';
    return (
      <div className="rounded-lg border border-line p-3">
        <div className="text-xs text-ink-3">{label}</div>
        <div className="mt-1 text-sm text-ink-2">在合理范围内都是{winner}更划算，这个参数改变不了结论。</div>
      </div>
    );
  }
  const margin = current - value;
  return (
    <div className="rounded-lg border border-line p-3">
      <div className="text-xs text-ink-3">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-ink">{value.toFixed(2)}%</div>
      <div className="mt-1 text-xs text-ink-2">
        高于它{higherFavors}更划算。当前假设 {current}%，{Math.abs(margin) < 0.05 ? '基本就在打平点上' : `${margin > 0 ? '高出' : '低了'} ${Math.abs(margin).toFixed(2)} 个百分点`}。
      </div>
    </div>
  );
}

export function SensitivityPanel({ s, horizon, appreciation, investmentReturn }: { s: Sensitivity; horizon: number; appreciation: number; investmentReturn: number }) {
  const max = Math.max(1, ...s.rows.flatMap((r) => [Math.abs(r.lowDelta), Math.abs(r.highDelta)]));
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Breakeven label="打平所需房价年涨幅" value={s.breakevenAppreciation} current={appreciation} higherFavors="买房" base={s.base} />
        <Breakeven label="打平所需投资回报率" value={s.breakevenInvestmentReturn} current={investmentReturn} higherFavors="租房" base={s.base} />
      </div>

      <p className="mt-5 text-xs text-ink-3">每次只调一个参数，第 {horizon} 年「买 − 租」差额的变化：</p>
      <div className="mt-1 flex justify-between text-xs">
        <span className="text-rent">← 利好租房</span>
        <span className="text-buy">利好买房 →</span>
      </div>
      <div className="mt-2 divide-y divide-line">
        {s.rows.map((r) => (
          <div key={r.key} className="grid items-center gap-1.5 py-2.5 sm:grid-cols-[110px_1fr] sm:gap-3">
            <div className="text-sm font-medium text-ink-2">{r.label}</div>
            <div className="space-y-1.5">
              {[
                { tag: r.lowLabel, d: r.lowDelta },
                { tag: r.highLabel, d: r.highDelta },
              ].map(({ tag, d }) => (
                <div key={tag} className="grid grid-cols-[64px_1fr_92px] items-center gap-2 text-xs sm:grid-cols-[72px_1fr_100px]">
                  <span className="tabular-nums text-ink-3">→ {tag}</span>
                  <Bar value={d} max={max} />
                  <span className={`text-right tabular-nums ${d >= 0 ? 'text-buy' : 'text-rent'}`}>{signed(d)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-3">按影响大小排序。房价涨幅的影响通常最大，因为它作用在全部房价上，而你只付了首付（杠杆）。</p>
    </div>
  );
}
