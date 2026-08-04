export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="12" y="24" width="6" height="14" rx="1.5" className="fill-brand-foreground/50" />
      <rect x="20.5" y="16" width="6" height="22" rx="1.5" className="fill-brand-foreground/75" />
      <rect x="29" y="10" width="6" height="28" rx="1.5" className="fill-brand-foreground" />
      <path
        d="M9 33L17 24L22 29L37 12"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M29 12H37V20"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
