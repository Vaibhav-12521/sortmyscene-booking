// Shared palette - mirrors the web app's light editorial theme.
export const colors = {
  bg: '#f3f1ec',
  bg2: '#eceae3',
  surface: '#ffffff',
  ink: '#18120e',
  text: '#2a2521',
  textSoft: '#6f685f',
  textDim: '#9a9389',
  border: '#e2ddd2',
  borderStrong: '#cfc8ba',
  accent: '#0f766e',
  accentDark: '#0b5a54',
  accentSoft: '#e3f1ef',
  reserved: '#c98a16',
  reservedSoft: '#fbf1da',
  booked: '#eceae3',
  success: '#2f7d52',
  danger: '#c0392b',
};

export const money = (amount, currency = 'INR') => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount ?? 0);
  } catch {
    return `${currency} ${amount ?? 0}`;
  }
};
