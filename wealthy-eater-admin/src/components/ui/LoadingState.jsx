import { Loader2 } from "lucide-react";

export function LoadingState({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-400">
      <Loader2 className="w-8 h-8 animate-spin mb-4 text-[var(--primary)]" />
      <p className="font-medium text-sm">{text}</p>
    </div>
  );
}
