

export function Badge({ children, variant = 'default', className = '' }) {
  const baseStyles = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    default: "border-transparent bg-[var(--bg-muted)] text-[var(--text-main)]",
    primary: "border-transparent bg-[var(--primary)] text-white",
    success: "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    warning: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    destructive: "border-transparent bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    info: "border-transparent bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400",
  };

  const variantClass = variants[variant] || variants.default;

  return (
    <div className={`${baseStyles} ${variantClass} ${className}`}>
      {children}
    </div>
  );
}
