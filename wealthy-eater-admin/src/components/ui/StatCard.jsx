

export function StatCard({ title, value, icon, trend, iconBg }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-sm flex flex-col gap-4">
      <div className="flex flex-row items-center justify-between">
        <h3 className="tracking-tight text-sm font-medium text-[var(--text-muted)]">{title}</h3>
        {icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: iconBg || 'var(--bg-muted)' }}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-3xl font-bold text-[var(--text-h)]">{value}</div>
        {trend && <p className="text-xs text-[var(--text-muted)]">{trend}</p>}
      </div>
    </div>
  );
}
