"use client"

/** Loaded only when the on-device brain is used — keep web-llm off the first paint. */

export async function loadOnDeviceModel(
  onProgress?: (text: string) => void
) {
  const { loadOnDeviceModel } = await import("@/lib/on-device")
  return loadOnDeviceModel(onProgress)
}

export async function replyOnDevice(
  input: Parameters<
    typeof import("@/lib/on-device").replyOnDevice
  >[0]
) {
  const { replyOnDevice } = await import("@/lib/on-device")
  return replyOnDevice(input)
}
