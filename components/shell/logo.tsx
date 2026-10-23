/** Smart Content mark — same SVG as the landing site (three rising bars + breakout dot). */
export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="2" y="17" width="8" height="13" rx="3" fill="#1a5cff" />
      <rect x="12" y="10" width="8" height="20" rx="3" fill="#1a5cff" />
      <rect x="22" y="14" width="8" height="16" rx="3" fill="#1a5cff" opacity="0.55" />
      <circle cx="26" cy="6" r="4" fill="#1a5cff" />
    </svg>
  );
}
