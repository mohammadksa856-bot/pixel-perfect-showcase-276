export function LogoMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M10 30C10 18.9543 18.9543 10 30 10C34.5 10 38.6 11.5 42 14"
        stroke="#D4A64A"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <rect x="12" y="24" width="6" height="14" rx="1.5" fill="#D4A64A" />
      <rect x="20.5" y="16" width="6" height="22" rx="1.5" fill="#1D9E75" />
      <rect x="29" y="10" width="6" height="28" rx="1.5" fill="#0F6E56" />
      <path
        d="M9 33L17 24L22 29L37 12"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M29 12H37V20"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
