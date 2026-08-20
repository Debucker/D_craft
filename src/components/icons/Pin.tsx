export function PinIcon({ className }: { className?: string }) {
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
      <path d="M6 2.4h4M8 2.4v4.4M4.8 6.8h6.4l-1 3.2H5.8z" />
      <path d="M8 10v3.6" />
    </svg>
  );
}
