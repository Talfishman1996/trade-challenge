import assert from 'node:assert/strict';
import test from 'node:test';
import { ANCHORS, plannedRisk } from '../model/riskModel.js';

const vectors = [
  [85_000, 12_750],
  [100_000, 15_000],
  [150_000, 20_051.225012337633],
  [200_000, 25_000],
  [350_000, 39_002.98230548824],
  [500_000, 50_000],
  [750_000, 63_274.37816492435],
  [1_000_000, 75_000],
  [1_500_000, 97_797.8478011711],
  [2_000_000, 120_000],
  [3_000_000, 175_449.4581378986],
  [5_000_000, 250_000],
  [7_500_000, 283_747.57593282865],
  [9_999_999, 299_999.99579013186],
];

test('canonical anchors are exact', () => {
  for (const anchor of ANCHORS.slice(0, -1)) {
    const result = plannedRisk(anchor.equity);
    assert.equal(result.dollarRisk, anchor.dollarRisk);
    assert.equal(result.riskFraction, anchor.riskFraction);
  }
});

test('P7 frozen parity vectors match', () => {
  for (const [equity, expectedRisk] of vectors) {
    const actual = plannedRisk(equity).dollarRisk;
    assert.ok(Math.abs(actual - expectedRisk) < 1e-7, `${equity}: ${actual} != ${expectedRisk}`);
  }
});

test('risk percentage falls while dollar risk rises', () => {
  let priorDollar = 0;
  let priorFraction = Infinity;
  for (let equity = 100_000; equity < 10_000_000; equity += 1_000) {
    const result = plannedRisk(equity);
    assert.ok(result.dollarRisk >= priorDollar);
    assert.ok(result.riskFraction <= priorFraction);
    priorDollar = result.dollarRisk;
    priorFraction = result.riskFraction;
  }
});

test('boundaries do not invent a post-target recommendation', () => {
  assert.equal(plannedRisk(50_000).dollarRisk, 7_500);
  assert.equal(plannedRisk(0).status, 'terminal');
  assert.equal(plannedRisk(10_000_000).status, 'target-reached');
  assert.equal(plannedRisk(10_000_000).dollarRisk, null);
});
