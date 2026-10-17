import { DEFAULT_INPUTS, type Inputs } from './calc';

/** 只把和默认值不同的参数写进 URL，链接短一些 */
export function encodeInputs(inp: Inputs): string {
  const params = new URLSearchParams();
  (Object.keys(DEFAULT_INPUTS) as (keyof Inputs)[]).forEach((k) => {
    if (inp[k] !== DEFAULT_INPUTS[k]) params.set(k, String(inp[k]));
  });
  return params.toString();
}

export function decodeInputs(search: string): Inputs {
  const params = new URLSearchParams(search);
  const out: Inputs = { ...DEFAULT_INPUTS };
  (Object.keys(DEFAULT_INPUTS) as (keyof Inputs)[]).forEach((k) => {
    const raw = params.get(k);
    if (raw === null) return;
    const def = DEFAULT_INPUTS[k];
    let v: unknown;
    if (typeof def === 'boolean') v = raw === 'true';
    else if (typeof def === 'number') {
      const n = Number(raw);
      if (!Number.isFinite(n)) return;
      v = n;
    } else v = raw;
    if (k === 'buyerProfile' && !['SC', 'SPR', 'FOREIGNER'].includes(v as string)) return;
    if (k === 'propertyIndex' && ![1, 2, 3].includes(v as number)) return;
    (out as unknown as Record<string, unknown>)[k] = v;
  });
  return out;
}
