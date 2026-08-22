import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

function Mark({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-4 shrink-0", className)} aria-hidden>
      {children}
    </svg>
  )
}

export function GoogleMark({ className }: { className?: string }) {
  return (
    <Mark className={className}>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </Mark>
  )
}

export function YouTubeMark({ className }: { className?: string }) {
  return (
    <Mark className={className}>
      <path
        fill="#FF0000"
        d="M23.5 6.2a3.05 3.05 0 0 0-2.14-2.16C19.4 3.6 12 3.6 12 3.6s-7.4 0-9.36.44A3.05 3.05 0 0 0 .5 6.2 32 32 0 0 0 0 12a32 32 0 0 0 .5 5.8 3.05 3.05 0 0 0 2.14 2.16C4.6 20.4 12 20.4 12 20.4s7.4 0 9.36-.44a3.05 3.05 0 0 0 2.14-2.16A32 32 0 0 0 24 12a32 32 0 0 0-.5-5.8z"
      />
      <path fill="#fff" d="M9.75 15.5v-7L16.5 12z" />
    </Mark>
  )
}

export function GitHubMark({ className }: { className?: string }) {
  return (
    <Mark className={className}>
      <path
        fill="currentColor"
        d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.04 1.53 1.04.9 1.52 2.35 1.08 2.92.83.09-.65.35-1.08.64-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.56 9.56 0 0 1 12 6.8c.85 0 1.71.12 2.51.34 1.9-1.29 2.74-1.02 2.74-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86v2.76c0 .26.18.58.69.48A10 10 0 0 0 12 2z"
      />
    </Mark>
  )
}

export function WikipediaMark({ className }: { className?: string }) {
  return (
    <Mark className={className}>
      <circle cx="12" cy="12" r="10" fill="#111" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fill="#fff"
        fontSize="11"
        fontFamily="Georgia, serif"
        fontWeight="700"
      >
        W
      </text>
    </Mark>
  )
}

export function GmailMark({ className }: { className?: string }) {
  return (
    <Mark className={className}>
      <path fill="#EA4335" d="M2 6.5 12 14l10-7.5V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
      <path fill="#4285F4" d="M2 6.5V18l6-4.6V8.8z" />
      <path fill="#34A853" d="M22 6.5V18l-6-4.6V8.8z" />
      <path fill="#FBBC05" d="M2 6.5 12 14 22 6.5 12 2z" />
    </Mark>
  )
}

export function GoogleCalendarMark({ className }: { className?: string }) {
  return (
    <Mark className={className}>
      <rect x="3" y="4" width="18" height="17" rx="3" fill="#fff" />
      <rect x="3" y="4" width="18" height="5" rx="3" fill="#1A73E8" />
      <rect x="3" y="7" width="18" height="2" fill="#1A73E8" />
      <text
        x="12"
        y="18"
        textAnchor="middle"
        fill="#1A73E8"
        fontSize="9"
        fontFamily="Arial, sans-serif"
        fontWeight="700"
      >
        31
      </text>
    </Mark>
  )
}

export function GoogleDriveMark({ className }: { className?: string }) {
  return (
    <Mark className={className}>
      <path fill="#FBBC05" d="M8.5 4h7L22 15.5h-7z" />
      <path fill="#34A853" d="M2 15.5 8.5 4h7L9 15.5z" />
      <path fill="#4285F4" d="M2 15.5h13l3.5 4.5H5.5z" />
    </Mark>
  )
}

export function GoogleDocsMark({ className }: { className?: string }) {
  return (
    <Mark className={className}>
      <path fill="#4285F4" d="M6 2h8l6 6v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <path fill="#A1C4FD" d="M14 2v6h6" />
      <path stroke="#fff" strokeWidth="1.4" d="M8 13h8M8 16.5h8M8 20h5" />
    </Mark>
  )
}

export function GoogleSheetsMark({ className }: { className?: string }) {
  return (
    <Mark className={className}>
      <path fill="#0F9D58" d="M6 2h8l6 6v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <path fill="#8FD3B4" d="M14 2v6h6" />
      <path fill="#fff" d="M7.5 12h9v8h-9z" />
      <path stroke="#0F9D58" strokeWidth="1" d="M12 12v8M7.5 16h9" />
    </Mark>
  )
}

export function GoogleTasksMark({ className }: { className?: string }) {
  return (
    <Mark className={className}>
      <circle cx="12" cy="12" r="10" fill="#2684FC" />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="2.2"
        strokeLinecap="round"
        d="m7.5 12.2 3 3 6-6.4"
      />
    </Mark>
  )
}

export function GoogleContactsMark({ className }: { className?: string }) {
  return (
    <Mark className={className}>
      <circle cx="12" cy="12" r="10" fill="#1A73E8" />
      <circle cx="12" cy="10" r="3.2" fill="#fff" />
      <path fill="#fff" d="M6.4 18.2a6.2 6.2 0 0 1 11.2 0 10 10 0 0 1-11.2 0z" />
    </Mark>
  )
}

export function GoogleMapsMark({ className }: { className?: string }) {
  return (
    <Mark className={className}>
      <path fill="#34A853" d="M4 20 10 4l4 16z" />
      <path fill="#FBBC05" d="m10 4 6 16 4-3-6-13z" />
      <path fill="#EA4335" d="M12 8.2a3.6 3.6 0 0 1 3.6 3.6c0 2.4-3.6 6.6-3.6 6.6S8.4 14.2 8.4 11.8A3.6 3.6 0 0 1 12 8.2z" />
      <circle cx="12" cy="11.6" r="1.5" fill="#fff" />
    </Mark>
  )
}

export function DuckDuckGoMark({ className }: { className?: string }) {
  return (
    <Mark className={className}>
      <circle cx="12" cy="12" r="10" fill="#DE5833" />
      <circle cx="12" cy="12.5" r="6.2" fill="#F5C14A" />
      <circle cx="10.6" cy="11.4" r="1.3" fill="#222" />
      <path
        fill="#222"
        d="M14.8 8.2c1.4-.2 2.8.4 3.5 1.5-.8.1-1.8.4-2.5.9-.3-.9-1-1.7-2-2z"
      />
    </Mark>
  )
}
