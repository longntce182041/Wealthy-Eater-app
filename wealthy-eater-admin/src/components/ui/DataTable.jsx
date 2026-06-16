

export function DataTable({ headers, children, emptyState }) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)] shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="bg-[var(--bg-muted)]/50">
            <tr className="border-b border-[var(--border)]">
              {headers.map((header, i) => (
                <th key={i} className="h-12 px-6 text-left align-middle font-semibold text-[var(--text-muted)] uppercase tracking-wider text-xs">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {children || emptyState}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function DataTableRow({ children, className = '' }) {
  return (
    <tr className={`border-b border-[var(--border)] transition-colors hover:bg-[var(--bg-muted)]/50 ${className}`}>
      {children}
    </tr>
  );
}

export function DataTableCell({ children, className = '' }) {
  return (
    <td className={`px-6 py-4 align-middle text-[var(--text-main)] ${className}`}>
      {children}
    </td>
  );
}
