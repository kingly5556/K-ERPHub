export function ErphubLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
        E
      </span>
      <span className="text-lg font-semibold tracking-tight">ERPHUB</span>
    </div>
  );
}
