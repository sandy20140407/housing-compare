import { useEffect, useId, useState, type ReactNode } from 'react';

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  /** 显示在数字框后面的单位 */
  unit?: string;
  hint?: ReactNode;
  /** 只要数字框，不要滑杆 */
  noSlider?: boolean;
}

/** 滑杆 + 数字框，两者同步；数字框允许临时为空，失焦时回落到合法值 */
export function NumberField({ label, value, onChange, min, max, step, unit, hint, noSlider }: NumberFieldProps) {
  const id = useId();
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const commit = (raw: string) => {
    const n = Number(raw);
    if (raw.trim() === '' || !Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, n));
    onChange(clamped);
    setText(String(clamped));
  };

  return (
    <div>
      <div className={noSlider ? 'mb-1 flex flex-col gap-1' : 'mb-1 flex items-center justify-between gap-2'}>
        <label htmlFor={id} className={noSlider ? 'text-xs text-ink-3' : 'text-sm text-ink-2'}>
          {label}
        </label>
        <div className="flex items-center gap-1">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            value={text}
            min={min}
            max={max}
            step={step}
            onChange={(e) => {
              setText(e.target.value);
              const n = Number(e.target.value);
              if (e.target.value !== '' && Number.isFinite(n) && n >= min && n <= max) onChange(n);
            }}
            onBlur={(e) => commit(e.target.value)}
            className={`${noSlider ? 'w-full min-w-0' : 'w-28'} rounded-md border border-line bg-surface px-2 py-1 text-right text-sm tabular-nums text-ink focus:border-accent focus:outline-none`}
          />
          {unit && <span className={`${noSlider ? 'shrink-0' : 'w-8'} text-xs text-ink-3`}>{unit}</span>}
        </div>
      </div>
      {!noSlider && (
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={Math.min(max, Math.max(min, value))}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-[var(--color-accent)]"
        />
      )}
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: ReactNode }) {
  const id = useId();
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm text-ink-2">
          {label}
        </label>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-line'}`}
        >
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-sm text-ink-2">{label}</div>
      <div className="flex rounded-lg border border-line bg-surface-2 p-0.5" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-md px-2 py-1 text-sm transition-colors ${
              value === o.value ? 'bg-surface font-medium text-ink shadow-sm' : 'text-ink-3 hover:text-ink-2'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Row({ label, value, sub, strong, tone }: { label: ReactNode; value: ReactNode; sub?: boolean; strong?: boolean; tone?: 'pos' | 'neg' }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-1.5 ${sub ? 'pl-4 text-xs text-ink-3' : 'text-sm text-ink-2'} ${strong ? 'border-t border-line pt-2 font-semibold text-ink' : ''}`}>
      <span>{label}</span>
      <span className={`tabular-nums ${tone === 'pos' ? 'text-pos' : tone === 'neg' ? 'text-neg' : ''}`}>{value}</span>
    </div>
  );
}
