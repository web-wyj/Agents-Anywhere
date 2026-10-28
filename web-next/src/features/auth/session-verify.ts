"use client"

import type { AuthMe, StoredSession } from "@/features/auth/types"

/**
 * Startup verification of a stored session.
 *
 * Only a rejected credential should sign the user out. Network failures and 5xx
 * responses are transient, so the stored session is kept and retried on the next
 * launch — but a long run of failures finally stops trusting it.
 */

export const VERIFY_FAILURE_KEY = "aa.session-verify-failures-v1"
export const MAX_VERIFY_FAILURES = 10

/** The API client reports transport failures as status 0, so only 401/403 reject. */
function isRejectedCredential(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false
  const status = (error as { status?: unknown }).status
  return status === 401 || status === 403
}

export function readVerifyFailures(): number {
  try {
    const raw = window.localStorage.getItem(VERIFY_FAILURE_KEY)
    const value = raw === null ? 0 : Number(raw)
    return Number.isFinite(value) && value > 0 ? value : 0
  } catch {
    return 0
  }
}

export function writeVerifyFailures(value: number): void {
  try {
    if (value <= 0) window.localStorage.removeItem(VERIFY_FAILURE_KEY)
    else window.localStorage.setItem(VERIFY_FAILURE_KEY, String(value))
  } catch {
    // Counters are best effort; never block sign-in on storage errors.
  }
}

/** True when the stored session must be dropped instead of retried. */
export function shouldEndSession(error: unknown): boolean {
  if (isRejectedCredential(error)) return true
  const failures = readVerifyFailures() + 1
  if (failures >= MAX_VERIFY_FAILURES) return true
  writeVerifyFailures(failures)
  return false
}

/** Minimal profile so the signed-in UI keeps rendering while unreachable. */
export function offlineProfile(session: StoredSession): AuthMe {
  return {
    userId: session.userId,
    email: null,
    displayName: "",
    emailVerified: false,
    role: session.role,
    disabled: false,
    avatar: null,
    serverTime: new Date().toISOString(),
  }
}
