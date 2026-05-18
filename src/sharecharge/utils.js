export function currency(value) {
  return `₪${Number(value || 0).toLocaleString('he-IL', { maximumFractionDigits: 2 })}`;
}

export function shortTime(time) {
  return new Intl.DateTimeFormat('he-IL', { hour: '2-digit', minute: '2-digit' }).format(new Date(time));
}

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 7)}`;
}

export function createOtp() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
