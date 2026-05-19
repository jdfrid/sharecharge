/**
 * כרטיס רגיל: מעטפת premium. כרטיס כהה (hero): ללא premium — כדי למנוע התנגשות עם .sc-skin .premium-card
 */
export function Card({ children, className = '' }) {
  const inverse = /\bbg-sc-text\b/.test(className) || /\bbg-slate-9\d{2}\b/.test(className);
  const shell = inverse
    ? 'rounded-sc-lg p-4 shadow-lg ring-1 ring-white/15'
    : 'premium-card rounded-sc-lg p-4';
  return <section className={`${shell} ${className}`}>{children}</section>;
}
