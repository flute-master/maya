import type { Metadata } from "next"
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
    "An offline companion — friend, advisor, presence. She searches only when she must.",
  icons: { icon: "/favicon.svg" },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${figtree.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
