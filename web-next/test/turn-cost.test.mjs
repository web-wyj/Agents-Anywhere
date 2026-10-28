import test from "node:test"
import assert from "node:assert/strict"

import {
  formatCostCny,
  formatTokenCount,
  readTurnCost,
} from "../src/lib/turn-cost.ts"

test("readTurnCost reads a well formed source.cost", () => {
  const cost = readTurnCost({
    cost: { cny: 0.0078931584, input: 6736, output: 138, cacheRead: 1024 },
  })
  assert.deepEqual(cost, {
    cny: 0.0078931584,
    input: 6736,
    output: 138,
    cacheRead: 1024,
  })
})

test("readTurnCost treats malformed values as absent", () => {
  assert.equal(readTurnCost(null), null)
  assert.equal(readTurnCost({}), null)
  assert.equal(readTurnCost({ cost: null }), null)
  assert.equal(readTurnCost({ cost: [] }), null)
  assert.equal(readTurnCost({ cost: "0.01" }), null)
  assert.equal(readTurnCost({ cost: { cny: "0.01" } }), null)
  assert.equal(readTurnCost({ cost: { cny: Number.NaN } }), null)
  assert.equal(readTurnCost({ cost: { cny: -1 } }), null)
})

test("readTurnCost fills missing token counts with zero", () => {
  assert.deepEqual(readTurnCost({ cost: { cny: 1 } }), {
    cny: 1,
    input: 0,
    output: 0,
    cacheRead: 0,
  })
  assert.deepEqual(readTurnCost({ cost: { cny: 1, input: -5, output: "x" } }), {
    cny: 1,
    input: 0,
    output: 0,
    cacheRead: 0,
  })
})

test("formatCostCny keeps small costs readable", () => {
  assert.equal(formatCostCny(0), "¥0")
  assert.equal(formatCostCny(0.0000412), "¥0.0000")
  assert.equal(formatCostCny(0.0078931), "¥0.0079")
  assert.equal(formatCostCny(0.5134), "¥0.513")
  assert.equal(formatCostCny(11.2216), "¥11.22")
  assert.equal(formatCostCny(-1), "¥0")
  assert.equal(formatCostCny(Number.NaN), "¥0")
})

test("formatTokenCount abbreviates large counts", () => {
  assert.equal(formatTokenCount(0), "0")
  assert.equal(formatTokenCount(987), "987")
  assert.equal(formatTokenCount(6736), "6.7k")
  assert.equal(formatTokenCount(138000), "138k")
  assert.equal(formatTokenCount(232623360), "233M")
  assert.equal(formatTokenCount(Number.NaN), "0")
})
