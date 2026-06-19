export const fmt = (n) => parseFloat(n || 0).toFixed(4);

export const CURRENCIES = {
  USD: { rate: 0.11, symbol: '$' },
  NGN: { rate: 168,  symbol: '₦' },
  KES: { rate: 14.2, symbol: 'KSh' },
  GHS: { rate: 1.35, symbol: 'GH₵' },
  PHP: { rate: 6.16, symbol: '₱' },
  IDR: { rate: 1720, symbol: 'Rp' },
};

export const toLocal = (xlm, code) => {
  const { rate, symbol } = CURRENCIES[code] || CURRENCIES.USD;
  const v = parseFloat(xlm || 0) * rate;
  return `${symbol}${v >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : v.toFixed(2)}`;
};
