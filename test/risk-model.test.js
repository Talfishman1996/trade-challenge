import test from 'node:test';
import assert from 'node:assert/strict';
import { RISK_ANCHORS } from '../src/math/constants.js';
import { MODEL_ID, plannedRisk } from '../src/math/risk.js';

test('canonical anchors are exact', () => {
  for (const anchor of RISK_ANCHORS.slice(0, -1)) {
    const result = plannedRisk(anchor.equity);
    assert.equal(result.modelId, MODEL_ID);
    assert.equal(result.status, 'active');
    assert.ok(Math.abs(result.dollarRisk - anchor.dollarRisk) < 1e-8);
    assert.ok(Math.abs(result.riskFraction - anchor.riskFraction) < 1e-12);
  }
});

test('risk percentage never rises and dollar risk never falls', () => {
  let priorFraction = Infinity;
  let priorDollars = 0;
  for (let index = 0; index <= 10000; index += 1) {
    const ratio = index / 10000;
    const equity = Math.exp(Math.log(100000) + ratio * (Math.log(9999999) - Math.log(100000)));
    const result = plannedRisk(equity);
    assert.ok(result.riskFraction <= priorFraction + 1e-12, `percentage increased at ${equity}`);
    assert.ok(result.dollarRisk + 1e-7 >= priorDollars, `dollar risk fell at ${equity}`);
    priorFraction = result.riskFraction;
    priorDollars = result.dollarRisk;
  }
});

test('boundaries withhold unsafe recommendations', () => {
  assert.equal(plannedRisk(0).status, 'terminal');
  assert.equal(plannedRisk(0).dollarRisk, null);
  assert.equal(plannedRisk(75000).riskFraction, 0.15);
  assert.equal(plannedRisk(75000).dollarRisk, 11250);
  assert.equal(plannedRisk(10000000).status, 'target-reached');
  assert.equal(plannedRisk(10000000).riskFraction, null);
  assert.equal(plannedRisk(10000000).dollarRisk, null);
});
