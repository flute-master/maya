import type { Metadata, Viewport } from "next"
import { Figtree, Fraunces } from "next/font/google"

import "./globals.css"

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
})

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Maya",
  description:
    "A free local companion. On-device model, optional web lookup, no paid APIs.",
  applicationName: "Maya",
  appleWebApp: {
    capable: true,
    title: "Maya",
    statusBarStyle: "black-translucent",
  },
  icons: { icon: "/favicon.svg", apple: "/favicon.svg" },
  manifest: "/manifest.webmanifest",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1c1612",
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${figtree.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col overscroll-none">{children}</body>
    </html>
  )
}
