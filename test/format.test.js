import test from 'node:test';
import assert from 'node:assert/strict';
import { fmtPnl } from '../src/math/format.js';

test('small nonzero R-multiples never display as signed zero', () => {
  assert.equal(fmtPnl(-700, 15000, true), '-0.05R');
  assert.equal(fmtPnl(1200, 15000, true), '+0.08R');
  assert.equal(fmtPnl(3000, 15000, true), '+0.2R');
});
