import { statusLabels, statusStyles } from '../../constants';

export function StatusPill({ status }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusStyles[status] || 'bg-slate-100 text-slate-700'}`}>
      {statusLabels[status] || status}
    </span>
  );
}
