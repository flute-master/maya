import {
  clearServiceAccount,
  googleStatus,
  saveServiceAccount,
} from "@/lib/google/auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Expected the service account JSON." }, { status: 400 })
  }
  try {
    const email = await saveServiceAccount(body)
    return Response.json({ ok: true, ...(await googleStatus()), email })
  } catch (caught) {
    return Response.json(
      {
        error:
          caught instanceof Error
            ? caught.message
            : "Could not save that service account.",
      },
      { status: 400 }
    )
  }
}

export async function DELETE() {
  await clearServiceAccount()
  return Response.json({ ok: true, ...(await googleStatus()) })
}
