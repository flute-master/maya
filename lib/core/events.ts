export type MayaEventType =
  | "MESSAGE_RECEIVED"
  | "THINKING_STARTED"
  | "MEMORY_RETRIEVED"
  | "TOOL_REQUESTED"
  | "PERMISSION_REQUIRED"
  | "TOOL_STARTED"
  | "TOOL_COMPLETED"
  | "PLAN_CREATED"
  | "TASK_COMPLETED"
  | "RESPONSE_READY"
  | "ERROR"

export type MayaEvent = {
  type: MayaEventType
  at: number
  detail?: string
}

type Listener = (event: MayaEvent) => void

const listeners = new Set<Listener>()
const recent: MayaEvent[] = []

export function emitMaya(type: MayaEventType, detail?: string) {
  const event: MayaEvent = { type, at: Date.now(), detail }
  recent.unshift(event)
  if (recent.length > 40) recent.length = 40
  for (const listener of listeners) {
    try {
      listener(event)
    } catch {
      /* UI subscribers must not break the runtime */
    }
  }
}

export function onMaya(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function recentMayaEvents() {
  return recent.slice(0, 20)
}
