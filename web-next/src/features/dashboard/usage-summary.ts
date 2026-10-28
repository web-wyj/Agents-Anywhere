"use client"

import * as React from "react"

export type UsageSummary = {
  todayTokens: number
  todayInput: number
  todayOutput: number
  todayCacheRead: number
  todayCny: number
  balanceCny: number | null
  capturedAt: number
}

const KEY = "aa-usage-summary-v1"
const EVENT = "aa-usage-summary-changed"

export function readUsageSummary(): UsageSummary | null {
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UsageSummary
    return typeof parsed?.todayCny === "number" && Number.isFinite(parsed.todayCny) ? parsed : null
  } catch {
    return null
  }
}

export function writeUsageSummary(summary: UsageSummary): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(summary))
    window.dispatchEvent(new CustomEvent(EVENT))
  } catch {
    // Quota or privacy mode: the footer simply stays without data.
  }
}

export function useUsageSummary(): UsageSummary | null {
  const [summary, setSummary] = React.useState<UsageSummary | null>(null)
  React.useEffect(() => {
    setSummary(readUsageSummary())
    const update = () => setSummary(readUsageSummary())
    window.addEventListener(EVENT, update)
    window.addEventListener("storage", update)
    return () => {
      window.removeEventListener(EVENT, update)
      window.removeEventListener("storage", update)
    }
  }, [])
  return summary
}
