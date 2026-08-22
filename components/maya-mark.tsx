export function MayaMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.14" />
      <path
        d="M12 4.5 13.8 9.2 18.8 10.2 15 13.6 16.1 18.6 12 15.9 7.9 18.6 9 13.6 5.2 10.2 10.2 9.2Z"
        fill="currentColor"
      />
    </svg>
  )
}
