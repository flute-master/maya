import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { startTraining, trainedReady, TRAIN_STATUS } from "@/lib/trained"

export const runtime = "nodejs"

async function statusPayload() {
  const ready = await trainedReady()
  let status: Record<string, unknown> = {}
  try {
    status = JSON.parse(await readFile(TRAIN_STATUS, "utf8")) as Record<
      string,
      unknown
    >
  } catch {
    status = {}
  }
  let meta: Record<string, unknown> | null = null
  try {
    meta = JSON.parse(
      await readFile(join(process.cwd(), "data", "maya-gpt-meta.json"), "utf8")
    ) as Record<string, unknown>
  } catch {
    meta = null
  }
  const updatedAt =
    typeof status.updatedAt === "number" ? status.updatedAt : 0
  const stale =
    Boolean(status.running) &&
    updatedAt > 0 &&
    Date.now() / 1000 - updatedAt > 900
  return {
    ready,
    running: Boolean(status.running) && !stale,
    step: status.step ?? 0,
    steps: status.steps ?? 0,
    loss: status.loss ?? null,
    error: stale
      ? "Trainer stopped updating. Start Train from chats again."
      : (status.error ?? null),
    device: status.device ?? meta?.device ?? null,
    params: meta?.params ?? null,
    trainedAt: meta?.trainedAt ?? null,
  }
}

export async function GET() {
  return Response.json(await statusPayload())
}

export async function POST(request: Request) {
  let steps = 1200
  try {
    const body = (await request.json()) as { steps?: number }
    if (typeof body.steps === "number" && body.steps >= 50 && body.steps <= 4000) {
      steps = Math.floor(body.steps)
    }
  } catch {
    /* default steps */
  }
  const current = await statusPayload()
  if (current.running) {
    return Response.json(
      { ...current, error: "Training is already running." },
      { status: 409 }
    )
  }
  const pid = startTraining(steps)
  if (!pid) {
    return Response.json({ error: "Could not start python3 train/train.py" }, { status: 500 })
  }
  return Response.json({ ...(await statusPayload()), ok: true, pid, steps })
}
