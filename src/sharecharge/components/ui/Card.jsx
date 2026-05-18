export function Card({ children, className = '' }) {
  return <section className={`premium-card rounded-sc-lg p-4 ${className}`}>{children}</section>;
}
