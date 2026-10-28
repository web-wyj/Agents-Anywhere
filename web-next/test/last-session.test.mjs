import assert from "node:assert/strict"
import test from "node:test"

// Minimal localStorage so the module can be exercised without a DOM.
class MemoryStorage {
  #map = new Map()
  getItem(key) { return this.#map.has(key) ? this.#map.get(key) : null }
  setItem(key, value) { this.#map.set(key, String(value)) }
  removeItem(key) { this.#map.delete(key) }
  clear() { this.#map.clear() }
}

const storage = new MemoryStorage()
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { localStorage: storage },
})

const { readLastSession, writeLastSession, clearLastSession } = await import(
  "../src/features/dashboard/last-session.ts"
)

const scopeA = { origin: "https://app.example.test", userId: "usr_a" }
const scopeB = { origin: "https://app.example.test", userId: "usr_b" }
const scopeOtherServer = { origin: "https://other.example.test", userId: "usr_a" }

test("a written session is read back", () => {
  storage.clear()
  writeLastSession(scopeA, "session_1")
  assert.equal(readLastSession(scopeA), "session_1")
})

test("accounts and servers never share a remembered session", () => {
  storage.clear()
  writeLastSession(scopeA, "session_a")
  writeLastSession(scopeB, "session_b")
  writeLastSession(scopeOtherServer, "session_c")
  assert.equal(readLastSession(scopeA), "session_a")
  assert.equal(readLastSession(scopeB), "session_b")
  assert.equal(readLastSession(scopeOtherServer), "session_c")
})

test("clearing drops only the matching scope", () => {
  storage.clear()
  writeLastSession(scopeA, "session_a")
  writeLastSession(scopeB, "session_b")
  clearLastSession(scopeA)
  assert.equal(readLastSession(scopeA), null)
  assert.equal(readLastSession(scopeB), "session_b")
})

test("a missing or blank entry reads as null", () => {
  storage.clear()
  assert.equal(readLastSession(scopeA), null)
  storage.setItem(`aa-last-session-v1:${scopeA.origin}:${scopeA.userId}`, "   ")
  assert.equal(readLastSession(scopeA), null)
})

test("a null scope is ignored instead of throwing", () => {
  storage.clear()
  writeLastSession(null, "session_a")
  clearLastSession(null)
  assert.equal(readLastSession(null), null)
  assert.equal(storage.getItem(`aa-last-session-v1:${scopeA.origin}:${scopeA.userId}`), null)
})
