import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { YearSnapshot } from '../lib/calc';
import { money, moneyShort } from '../lib/format';

export function NetWorthChart({ series, horizon, topYear }: { series: YearSnapshot[]; horizon: number; topYear: number | null }) {
  const data = series.map((s) => ({ year: s.year, buy: Math.round(s.buyNetWorth), rent: Math.round(s.rentNetWorth) }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-line)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="year"
            tickFormatter={(y) => `${y}年`}
            tick={{ fill: 'var(--color-ink-3)', fontSize: 12 }}
            stroke="var(--color-line)"
          />
          <YAxis tickFormatter={moneyShort} width={52} tick={{ fill: 'var(--color-ink-3)', fontSize: 12 }} stroke="var(--color-line)" />
          <Tooltip
            formatter={(v, name) => [money(Number(v)), name === 'buy' ? '买房' : '租房 + 投资']}
            labelFormatter={(y) => `第 ${y} 年末（按变现计）`}
            contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 8, fontSize: 13 }}
            labelStyle={{ color: 'var(--color-ink-2)' }}
          />
          <Legend formatter={(v) => (v === 'buy' ? '买房' : '租房 + 投资')} wrapperStyle={{ fontSize: 13 }} />
          {topYear !== null && (
            <ReferenceLine x={topYear} stroke="var(--color-ink-3)" strokeDasharray="2 4" label={{ value: 'TOP', fill: 'var(--color-ink-3)', fontSize: 11, position: 'insideTopLeft' }} />
          )}
          <ReferenceLine x={horizon} stroke="var(--color-accent)" label={{ value: '比较期', fill: 'var(--color-accent)', fontSize: 11, position: 'insideTopRight' }} />
          <Line type="monotone" dataKey="buy" stroke="var(--color-buy)" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="rent" stroke="var(--color-rent)" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
