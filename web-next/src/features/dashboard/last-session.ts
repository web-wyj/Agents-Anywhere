"use client"

/**
 * Remembers the last session a user opened so the PWA can restore it on a cold
 * start. A home-screen launch always begins at the manifest `start_url` (`/`),
 * which otherwise drops the user on the new-session page every time.
 *
 * Scope mirrors the iOS restoration store: server origin plus user id, so two
 * accounts or two servers on the same device never share a remembered session.
 */

const STORAGE_PREFIX = "aa-last-session-v1"

export type LastSessionScope = {
  origin: string
  userId: string
}

function storageKey(scope: LastSessionScope): string {
  return `${STORAGE_PREFIX}:${scope.origin}:${scope.userId}`
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readLastSession(scope: LastSessionScope | null): string | null {
  if (!scope) return null
  const store = storage()
  if (!store) return null
  try {
    const value = store.getItem(storageKey(scope))
    return value && value.trim() ? value : null
  } catch {
    return null
  }
}

export function writeLastSession(scope: LastSessionScope | null, sessionId: string): void {
  if (!scope || !sessionId) return
  const store = storage()
  if (!store) return
  try {
    store.setItem(storageKey(scope), sessionId)
  } catch {
    // Remembering the session is a convenience; never break navigation for it.
  }
}

export function clearLastSession(scope: LastSessionScope | null): void {
  if (!scope) return
  const store = storage()
  if (!store) return
  try {
    store.removeItem(storageKey(scope))
  } catch {
    // Ignore storage failures for the same reason as above.
  }
}
