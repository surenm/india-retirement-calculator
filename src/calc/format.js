const grouped = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

// ₹4.25 Cr, ₹38.5 L, ₹12,500
export function inr(n, { exact = false } = {}) {
  if (!Number.isFinite(n)) return '–';
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (exact || a < 1e5) return sign + '₹' + grouped.format(Math.round(a));
  if (a >= 1e7) return sign + '₹' + trim(a / 1e7, a >= 1e9 ? 0 : 2) + ' Cr';
  return sign + '₹' + trim(a / 1e5, a >= 1e6 ? 1 : 2) + ' L';
}

export function inrExact(n) {
  return inr(n, { exact: true });
}

export function pct(n, digits = 0) {
  if (!Number.isFinite(n)) return '–';
  return (n * 100).toFixed(digits) + '%';
}

function trim(n, digits) {
  return n.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');
}
