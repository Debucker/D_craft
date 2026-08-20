export function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="1.6" y="3.2" width="12.8" height="9.6" rx="1.6" />
      <path d="M2.2 4 8 8.6 13.8 4" />
    </svg>
  );
}
