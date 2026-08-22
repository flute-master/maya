import { policyFor, type PermissionMode, type ToolPolicy } from "@/lib/permissions/policies"
import { hasSessionGrant } from "@/lib/db/store"

export type PermissionTrust = {
  allowSearch: boolean
  allowPython: boolean
  allowFileWrite: boolean
  allowGoogleWrite: boolean
}

export type PermissionDecision = {
  allow: boolean
  pending: boolean
  mode: PermissionMode
  reason: string
  policy: ToolPolicy
}

function isGoogleRead(tool: string, action?: string) {
  if (!tool.startsWith("google_")) return false
  if (tool === "google_gmail") return action !== "send"
  if (tool === "google_calendar") return action !== "create"
  if (tool === "google_tasks") return action !== "add"
  return true
}

export function decidePermission(input: {
  tool: string
  action?: string
  reason?: string
  trust: PermissionTrust
  approved?: boolean
}): PermissionDecision {
  const policy = policyFor(input.tool)
  if (policy.mode === "disabled") {
    return {
      allow: false,
      pending: false,
      mode: policy.mode,
      reason: `${policy.label} is disabled. Maya Core will not run it.`,
      policy,
    }
  }

  if (input.approved) {
    return {
      allow: true,
      pending: false,
      mode: policy.mode,
      reason: "Allowed once for this turn.",
      policy,
    }
  }

  if (hasSessionGrant(input.tool)) {
    return {
      allow: true,
      pending: false,
      mode: policy.mode,
      reason: "Allowed for this session.",
      policy,
    }
  }

  if (policy.network && !input.trust.allowSearch) {
    return {
      allow: false,
      pending: true,
      mode: policy.mode,
      reason: "Internet is off in Customize. Allow this lookup once?",
      policy,
    }
  }

  if (input.tool === "python" && input.trust.allowPython) {
    return {
      allow: true,
      pending: false,
      mode: policy.mode,
      reason: "Python always-allow is on.",
      policy,
    }
  }
  if (input.tool === "files_write" && input.trust.allowFileWrite) {
    return {
      allow: true,
      pending: false,
      mode: policy.mode,
      reason: "File writes always-allow is on.",
      policy,
    }
  }

  const googleRead = isGoogleRead(input.tool, input.action)
  if (input.tool.startsWith("google_") && googleRead) {
    return {
      allow: true,
      pending: false,
      mode: policy.mode,
      reason: "Google read. Writes still ask.",
      policy,
    }
  }
  if (
    input.tool.startsWith("google_") &&
    !googleRead &&
    input.tool !== "google_gmail" &&
    input.trust.allowGoogleWrite
  ) {
    return {
      allow: true,
      pending: false,
      mode: policy.mode,
      reason: "Google writes always-allow is on.",
      policy,
    }
  }

  if (policy.mode === "automatic") {
    return {
      allow: true,
      pending: false,
      mode: policy.mode,
      reason: input.reason || `${policy.label} is automatic.`,
      policy,
    }
  }

  return {
    allow: false,
    pending: true,
    mode: policy.mode,
    reason:
      input.reason ||
      (policy.mode === "always_ask"
        ? `${policy.label} always asks before it runs.`
        : `${policy.label} needs your OK.`),
    policy,
  }
}
