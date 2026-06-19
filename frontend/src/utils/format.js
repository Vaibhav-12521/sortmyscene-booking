const formatters = new Map();

/** Format an integer amount as currency (no decimals), memoized per currency. */
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
      // Invalid currency code — fall back to a plain number formatter.
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
