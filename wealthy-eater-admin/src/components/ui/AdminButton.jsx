import { Loader2 } from "lucide-react";

export function AdminButton({ children, variant = 'primary', className = '', size = 'default', isLoading = false, disabled, ...props }) {
  const baseStyles = "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 cursor-pointer";
  
  const variants = {
    primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm",
    secondary: "bg-[var(--bg-muted)] text-[var(--text-main)] hover:bg-slate-200 dark:hover:bg-slate-800",
    outline: "border border-[var(--border)] bg-transparent hover:bg-[var(--bg-muted)] text-[var(--text-main)]",
    ghost: "hover:bg-[var(--bg-muted)] text-[var(--text-main)]",
    destructive: "bg-[var(--destructive)] text-white hover:opacity-90 shadow-sm",
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-lg px-3",
    lg: "h-11 rounded-xl px-8",
    icon: "h-10 w-10",
  };

  const variantClass = variants[variant] || variants.primary;
  const sizeClass = sizes[size] || sizes.default;

  return (
    <button 
      className={`${baseStyles} ${variantClass} ${sizeClass} ${className}`} 
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
