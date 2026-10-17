const sgd = new Intl.NumberFormat('en-SG', {
  style: 'currency',
  currency: 'SGD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const money = (n: number) => sgd.format(Math.round(n) === 0 ? 0 : n);

/** 紧凑金额，用于图表坐标轴：1.2M / 850k */
export const moneyShort = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
};

export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
