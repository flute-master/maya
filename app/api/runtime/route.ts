import { networkInterfaces } from "node:os"

import { ollamaReady } from "@/lib/ollama"

export const runtime = "nodejs"

function lanUrls(port: string) {
  const urls: string[] = []
  const nets = networkInterfaces()
  for (const rows of Object.values(nets)) {
    for (const row of rows ?? []) {
      if (row.internal || row.family !== "IPv4") continue
      urls.push(`http://${row.address}:${port}`)
    }
  }
  return urls
}

export async function GET() {
  const port = process.env.PORT || "43217"
  const model = await ollamaReady()
  return Response.json({
    port,
    ollama: Boolean(model),
    model,
    lan: lanUrls(port),
    phone: "On the same Wi‑Fi, open a LAN URL in Chrome or Safari, then Add to Home Screen.",
  })
}
