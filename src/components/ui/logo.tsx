export function Logo({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M5 6h17.5c3 0 4.8 3.3 3.1 5.8L16.8 24H27v3H6.5c-1.9 0-3-2.1-1.9-3.7L18.6 9H5z" fill="rgb(var(--brand))" />
    </svg>
  );
}

export function Wordmark({ badge = "Creator" }: { badge?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Logo />
      <span className="text-[17px] font-bold tracking-tight">Project Two</span>
      <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-subtle">{badge}</span>
    </div>
  );
}
