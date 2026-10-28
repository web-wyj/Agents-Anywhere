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

const { ApiError } = await import("../src/lib/api/errors.ts")
const {
  MAX_VERIFY_FAILURES,
  VERIFY_FAILURE_KEY,
  offlineProfile,
  readVerifyFailures,
  shouldEndSession,
  writeVerifyFailures,
} = await import("../src/features/auth/session-verify.ts")

const rejected = () => new ApiError({ status: 401, detail: "unauthorized", kind: "unauthorized" })
const network = () => new ApiError({ status: 0, detail: "network", kind: "network" })
const serverError = () => new ApiError({ status: 503, detail: "unavailable", kind: "server" })

test("rejected credentials end the session without counting a retry", () => {
  storage.clear()
  assert.equal(shouldEndSession(rejected()), true)
  assert.equal(readVerifyFailures(), 0)
})

test("forbidden responses also end the session", () => {
  storage.clear()
  const forbidden = new ApiError({ status: 403, detail: "forbidden", kind: "forbidden" })
  assert.equal(shouldEndSession(forbidden), true)
  assert.equal(readVerifyFailures(), 0)
})

test("network failures keep the session and count up", () => {
  storage.clear()
  assert.equal(shouldEndSession(network()), false)
  assert.equal(readVerifyFailures(), 1)
  assert.equal(shouldEndSession(network()), false)
  assert.equal(readVerifyFailures(), 2)
})

test("server errors are treated as transient too", () => {
  storage.clear()
  assert.equal(shouldEndSession(serverError()), false)
  assert.equal(readVerifyFailures(), 1)
})

test("non-API errors are treated as transient", () => {
  storage.clear()
  assert.equal(shouldEndSession(new Error("boom")), false)
  assert.equal(readVerifyFailures(), 1)
})

test("the last tolerated failure ends the session", () => {
  storage.clear()
  for (let attempt = 1; attempt < MAX_VERIFY_FAILURES; attempt += 1) {
    assert.equal(shouldEndSession(network()), false, `failure ${attempt} should keep the session`)
  }
  assert.equal(readVerifyFailures(), MAX_VERIFY_FAILURES - 1)
  assert.equal(shouldEndSession(network()), true)
})

test("a successful verification clears the counter", () => {
  storage.clear()
  writeVerifyFailures(4)
  assert.equal(readVerifyFailures(), 4)
  writeVerifyFailures(0)
  assert.equal(readVerifyFailures(), 0)
  assert.equal(storage.getItem(VERIFY_FAILURE_KEY), null)
})

test("a corrupted counter reads as zero", () => {
  storage.clear()
  storage.setItem(VERIFY_FAILURE_KEY, "not-a-number")
  assert.equal(readVerifyFailures(), 0)
})

test("the offline profile keeps identity and role", () => {
  const profile = offlineProfile({ accessToken: "token", userId: "usr_1", role: "admin" })
  assert.equal(profile.userId, "usr_1")
  assert.equal(profile.role, "admin")
  assert.equal(profile.email, null)
})
