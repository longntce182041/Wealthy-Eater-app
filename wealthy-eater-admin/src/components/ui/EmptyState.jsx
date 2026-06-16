import { AdminButton } from './AdminButton';

export function EmptyState({ icon: Icon, title = 'No results found', description = 'Try adjusting your filters.', action }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white border border-[var(--border)] rounded-2xl shadow-sm my-6">
      {Icon && (
        <div className="mb-4 text-slate-400 bg-slate-50 p-4 rounded-full">
          <Icon size={32} />
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--text-main)] mb-1">{title}</h3>
      <p className="text-sm text-slate-500 mb-6 max-w-sm">{description}</p>
      {action && (
        <AdminButton onClick={action.onClick} variant="primary">
          {action.label}
        </AdminButton>
      )}
    </div>
  );
}
