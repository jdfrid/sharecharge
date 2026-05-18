const toneClasses = {
  emerald: 'bg-emerald-100 text-emerald-700',
  blue: 'bg-blue-100 text-blue-700',
  amber: 'bg-amber-100 text-amber-700',
  slate: 'bg-slate-900 text-white',
};

export function MetricCard({ icon: Icon, value, label, tone = 'emerald' }) {
  return (
    <div className="rounded-sc-md bg-white/90 p-3 shadow-sm ring-1 ring-slate-100/80">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${toneClasses[tone] || toneClasses.emerald}`}>
        <Icon size={19} />
      </div>
      <p className="text-xl font-black">{value}</p>
      <p className="text-xs font-bold text-slate-500">{label}</p>
    </div>
  );
}
