const formatters = new Map();

export function money(amount, currency = 'INR') {
  const code = currency || 'INR';
  if (!formatters.has(code)) {
    try {
      formatters.set(
        code,
        new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: code,
          maximumFractionDigits: 0,
        })
      );
    } catch {

      formatters.set(code, new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }));
    }
  }
  return formatters.get(code).format(amount ?? 0);
}

export const TIER_LABELS = {
  vip: 'VIP',
  premium: 'Premium',
  standard: 'Standard',
};
