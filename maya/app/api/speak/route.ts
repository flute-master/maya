import { spawn } from "node:child_process"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

export const runtime = "nodejs"

const MAX_CHARS = 3500
const SCRIPT = join(process.cwd(), "scripts/speak.py")
const PYTHON_BINS =
  process.platform === "win32"
    ? ["python", "py", "python3"]
    : ["python3", "python"]

type Body = {
  text?: string
  sage?: boolean
}

function runWithPython(
  bin: string,
  text: string,
  sage: boolean,
  outFile: string
) {
  const voice = "en-IN-NeerjaExpressiveNeural"
  const rate = sage ? "-4%" : "+2%"
  const pitch = "+0Hz"
  return new Promise<void>((resolve, reject) => {
    const child = spawn(bin, [SCRIPT, voice, rate, pitch, outFile], {
      stdio: ["pipe", "pipe", "pipe"],
    })
    let stderr = ""
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk)
    })
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.trim() || `speak.py exited ${code}`))
    })
    child.stdin.write(text)
    child.stdin.end()
  })
}

async function runPython(text: string, sage: boolean, outFile: string) {
  let lastError: unknown
  for (const bin of PYTHON_BINS) {
    try {
      await runWithPython(bin, text, sage, outFile)
      return
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Python with edge-tts was not found.")
}

export async function POST(request: Request) {
  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 })
  }

  const text = String(body.text ?? "").trim().slice(0, MAX_CHARS)
  if (!text) {
    return Response.json({ error: "Nothing to speak." }, { status: 400 })
  }

  const dir = await mkdtemp(join(tmpdir(), "maya-speak-"))
  const rawFile = join(dir, "raw.mp3")
  try {
    await runPython(text, Boolean(body.sage), rawFile)
    const bytes = await readFile(rawFile)
    return new Response(bytes, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not build a spoken line.",
      },
      { status: 503 }
    )
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
