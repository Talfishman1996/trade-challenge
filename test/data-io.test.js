import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCSV } from '../src/utils/dataIO.js';

test('CSV export safely quotes multiline content and spreadsheet formulas once', () => {
  const csv = buildCSV([{
    id: 1,
    date: '2026-07-12',
    ticker: '=HYPERLINK("https://bad.example")',
    pnl: 100,
    equityBefore: 100000,
    equityAfter: 100100,
    setupTags: ['Breakout', 'High, volume'],
    notes: 'First line\nSecond "quoted" line',
  }]);

  assert.match(csv, /"'=HYPERLINK\(""https:\/\/bad\.example""\)"/);
  assert.match(csv, /"Breakout, High, volume"/);
  assert.match(csv, /"First line\nSecond ""quoted"" line"/);
  assert.doesNotMatch(csv, /"""First line/);
  assert.equal(csv.split('\r\n').length, 2);
});
