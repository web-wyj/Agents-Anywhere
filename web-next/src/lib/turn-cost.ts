/**
 * Helpers for the per-turn cost that metered runtimes report on a timeline
 * item's `source.cost` as `{ cny, input, output, cacheRead }`.
 *
 * Kept dependency-free so Node tests can import it directly.
 */

export type TurnCost = {
  /** Already converted to CNY by the runtime's cost meter. */
  cny: number
  input: number
  output: number
  cacheRead: number
}

export function readTurnCost(source: Record<string, unknown> | null | undefined): TurnCost | null {
  const raw = source?.cost
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  const cny = typeof record.cny === "number" && Number.isFinite(record.cny) ? record.cny : null
  if (cny === null || cny < 0) return null
  const tokens = (key: string) => {
    const value = record[key]
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0
  }
  return {
    cny,
    input: tokens("input"),
    output: tokens("output"),
    cacheRead: tokens("cacheRead"),
  }
}

export function formatCostCny(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "¥0"
  if (value >= 1) return `¥${value.toFixed(2)}`
  if (value >= 0.01) return `¥${value.toFixed(3)}`
  return `¥${value.toFixed(4)}`
}

export function formatTokenCount(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0"
  if (value >= 1_000_000) {
    const scaled = value / 1_000_000
    return `${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1)}M`
  }
  if (value >= 1_000) {
    const scaled = value / 1_000
    return `${scaled >= 10 ? scaled.toFixed(0) : scaled.toFixed(1)}k`
  }
  return String(Math.round(value))
}
