import { readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export type SessionCost = { cny: number; input: number; output: number; cacheRead: number }

type LedgerDay = { sessions?: Array<Record<string, unknown>> }

function ledgerPath(): string {
  return join(process.env.DSH_HOME ?? join(homedir(), '.dsh'), 'storages', 'cost-meter', 'ledger.json')
}

let cache: { mtimeMs: number; sessions: Map<string, SessionCost> } | null = null

function num(entry: Record<string, unknown>, key: string): number {
  const value = entry[key]
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

function parse(path: string): Map<string, SessionCost> | null {
  try {
    const ledger = JSON.parse(readFileSync(path, 'utf8')) as { days?: Record<string, LedgerDay> }
    const sessions = new Map<string, SessionCost>()
    for (const day of Object.values(ledger.days ?? {})) {
      for (const entry of day?.sessions ?? []) {
        const id = typeof entry.id === 'string' ? entry.id : null
        if (!id) continue
        const current = sessions.get(id) ?? { cny: 0, input: 0, output: 0, cacheRead: 0 }
        sessions.set(id, {
          cny: current.cny + num(entry, 'costCny'),
          input: current.input + num(entry, 'input'),
          output: current.output + num(entry, 'output'),
          cacheRead: current.cacheRead + num(entry, 'cacheRead'),
        })
      }
    }
    return sessions
  } catch { return null }
}

/**
 * Cumulative cost the optional `dsh-cost-meter` plugin recorded for one session,
 * summed across the days present in its ledger. Returns null when the plugin is
 * absent or the file is unreadable, so callers can simply skip reporting cost.
 */
export function readSessionCost(externalSessionId: string): SessionCost | null {
  let path: string
  try { path = ledgerPath() } catch { return null }
  let mtimeMs: number
  try { mtimeMs = statSync(path).mtimeMs } catch { return cache?.sessions.get(externalSessionId) ?? null }
  if (!cache || cache.mtimeMs !== mtimeMs) {
    const sessions = parse(path)
    if (!sessions) return cache?.sessions.get(externalSessionId) ?? null
    cache = { mtimeMs, sessions }
  }
  return cache.sessions.get(externalSessionId) ?? null
}

export type UsageSummary = {
  todayTokens: number
  todayInput: number
  todayOutput: number
  todayCacheRead: number
  todayCny: number
  balanceCny: number | null
  capturedAt: number
}

/** Totals for the most recent day in the ledger plus the cached official balance. */
export function readUsageSummary(): UsageSummary | null {
  let path: string
  try { path = ledgerPath() } catch { return null }
  try {
    const ledger = JSON.parse(readFileSync(path, "utf8")) as {
      days?: Record<string, LedgerDay>
      balanceRef?: Record<string, unknown>
    }
    const days = Object.keys(ledger.days ?? {}).sort()
    const latest = days[days.length - 1]
    if (!latest) return null
    const day = ledger.days![latest] as unknown as Record<string, unknown>
    const todayInput = num(day, "input")
    const todayOutput = num(day, "output")
    const todayCacheRead = num(day, "cacheRead")
    // balanceRef: { date, total, granted, topped, currency, at, ledgerCost }
    const balance = ledger.balanceRef ?? {}
    const currency = typeof balance.currency === "string" ? balance.currency : "CNY"
    const rawTotal = typeof balance.total === "number" && Number.isFinite(balance.total) ? balance.total : null
    const balanceCny = currency === "CNY" && rawTotal !== null ? rawTotal : null
    return {
      todayTokens: todayInput + todayOutput + todayCacheRead,
      todayInput,
      todayOutput,
      todayCacheRead,
      todayCny: num(day, "costCny"),
      balanceCny,
      capturedAt: Date.now(),
    }
  } catch { return null }
}
