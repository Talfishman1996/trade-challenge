import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const capability = `${'v'.repeat(32)}.${'s'.repeat(43)}`;
const workerOrigin = 'https://tradevault-sync.talfishmanbusiness.workers.dev';

const connectVault = async page => {
  await page.addInitScript(value => {
    localStorage.setItem('tradevault-capability-100k-v1', value);
  }, capability);
};

const mockEncryptedVault = async page => {
  const vaults = new Map();

  await page.route(`${workerOrigin}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const vaultId = url.pathname.match(/\/v3\/vault\/([^/]+)/)?.[1] || 'unknown';
    if (!vaults.has(vaultId)) vaults.set(vaultId, { records: new Map(), revision: 0 });
    const vault = vaults.get(vaultId);

    if (url.pathname.endsWith('/backups') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ backups: [] }) });
    }
    if (url.pathname.endsWith('/backup') && method === 'POST') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, backupId: `manual:${Date.now()}`, backups: [] }) });
    }
    if (url.pathname.includes('/assets/')) {
      return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'asset not found' }) });
    }
    if (!url.pathname.endsWith('/sync') || method !== 'POST') {
      return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'not found' }) });
    }

    const payload = request.postDataJSON();
    const acknowledged = [];
    for (const operation of payload.operations || []) {
      const current = vault.records.get(operation.uid);
      if (current && current.revision > operation.baseServerRevision && current.clientId !== payload.clientId) {
        acknowledged.push({ id: operation.id, status: 'conflict', serverRevision: current.revision });
        continue;
      }
      vault.revision += 1;
      vault.records.set(operation.uid, {
        type: operation.type,
        payload: operation.payload,
        revision: vault.revision,
        clientId: payload.clientId,
        updatedAt: Date.now(),
      });
      acknowledged.push({ id: operation.id, status: 'applied', serverRevision: vault.revision });
    }

    const trades = [];
    const tombstones = [];
    let initialEquityRecord = null;
    let preferencesRecord = null;
    for (const [uid, record] of vault.records) {
      if (record.type === 'upsert_trade') {
        trades.push({ ...record.payload, uid, serverRevision: record.revision, serverUpdatedAt: record.updatedAt });
      } else if (record.type === 'delete_trade') {
        tombstones.push({ ...record.payload, uid, serverRevision: record.revision, serverUpdatedAt: record.updatedAt });
      } else if (record.type === 'set_initial_equity') {
        initialEquityRecord = { ...record.payload, serverRevision: record.revision, serverUpdatedAt: record.updatedAt };
      } else if (record.type === 'set_preferences') {
        preferencesRecord = { ...record.payload, serverRevision: record.revision, serverUpdatedAt: record.updatedAt };
      }
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        acknowledged,
        snapshot: {
          version: 5,
          schemaVersion: 5,
          encryptionVersion: 1,
          initialEquity: 100000,
          initialEquityRecord,
          initialEquityRevision: initialEquityRecord?.serverRevision || 0,
          preferences: null,
          preferencesRecord,
          preferencesRevision: preferencesRecord?.serverRevision || 0,
          trades,
          tombstones,
          serverRevision: vault.revision,
          serverTime: Date.now(),
        },
      }),
    });
  });
};

const expectNoHorizontalOverflow = async page => {
  const dimensions = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport + 1);
};

const firstLogTradeButton = page => page.getByRole('button', { name: 'Log Trade' }).first();

test('fresh device requires a valid private link', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Open your private app link' })).toBeVisible();
  await page.getByPlaceholder('Paste private TradeVault link').fill('https://example.com/not-a-vault');
  await page.getByRole('button', { name: 'Open TradeVault' }).click();
  await expect(page.getByText('incomplete or invalid')).toBeVisible();
});

test('mobile user can log a trade without removed strategy or tag fields', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await connectVault(page);
  await mockEncryptedVault(page);
  await page.goto('/');
  await expect(firstLogTradeButton(page)).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await firstLogTradeButton(page).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Strategy & Sizing')).toHaveCount(0);
  await expect(page.getByText('Tags', { exact: true })).toHaveCount(0);
  await page.getByPlaceholder('0.00').fill('2500');
  await page.getByPlaceholder('e.g., AAPL, ES, BTC').fill('BTC');
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Save Trade', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.getByRole('button', { name: 'Trades', exact: true }).click();
  await expect(page.locator('span').filter({ hasText: /^BTC$/ }).first()).toBeVisible();
  await expect(page.getByText('+$2.5K', { exact: true }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('JSON and CSV exports download valid files on a phone viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await connectVault(page);
  await mockEncryptedVault(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  const jsonDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'JSON' }).click();
  const jsonDownload = await jsonDownloadPromise;
  const jsonPath = await jsonDownload.path();
  const exported = JSON.parse(await readFile(jsonPath, 'utf8'));
  expect(Array.isArray(exported.trades)).toBe(true);
  expect(exported.initialEquity).toBe(100000);

  const csvDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV' }).click();
  const csvDownload = await csvDownloadPromise;
  const csvPath = await csvDownload.path();
  const csv = await readFile(csvPath, 'utf8');
  expect(csv.startsWith('Trade #,Date,Open Date')).toBe(true);
});

test('production PWA registers and reloads its shell while offline', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await connectVault(page);
  await mockEncryptedVault(page);
  await page.goto('/');
  await expect(firstLogTradeButton(page)).toBeVisible();

  const manifest = await page.request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  const manifestJson = await manifest.json();
  expect(manifestJson.display).toBe('standalone');
  expect(manifestJson.icons.some(icon => icon.sizes === '512x512')).toBe(true);

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller) return;
    await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
  });
  const cachedUrls = await page.evaluate(async () => {
    const keys = await caches.keys();
    const requests = await Promise.all(keys.map(async key => (await caches.open(key)).keys()));
    return requests.flat().map(request => new URL(request.url).pathname);
  });
  expect(cachedUrls).toContain('/index.html');
  expect(cachedUrls.some(url => /^\/assets\/index-.*\.js$/.test(url))).toBe(true);
  expect(cachedUrls.some(url => /^\/assets\/index-.*\.css$/.test(url))).toBe(true);
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  expect(await page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await expect(firstLogTradeButton(page)).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('private-link rotation verifies a new vault before switching this device', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await connectVault(page);
  await mockEncryptedVault(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

  await page.getByRole('button', { name: 'Rotate Private Link' }).click();
  await page.getByRole('button', { name: 'Confirm Rotation' }).click();
  await expect(page.getByText('Rotation succeeded')).toBeVisible();

  const rotatedCapability = await page.evaluate(() => localStorage.getItem('tradevault-capability-100k-v1'));
  expect(rotatedCapability).not.toBe(capability);
  expect(rotatedCapability).toMatch(/^[A-Za-z0-9_-]{16,80}\.[A-Za-z0-9_-]{32,128}$/);
});

for (const viewport of [
  { width: 320, height: 568, name: 'small-phone' },
  { width: 390, height: 844, name: 'phone' },
  { width: 844, height: 390, name: 'landscape' },
]) {
  test(`core views avoid horizontal overflow at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await connectVault(page);
    await mockEncryptedVault(page);
    await page.goto('/');
    await expect(firstLogTradeButton(page)).toBeVisible();
    await expectNoHorizontalOverflow(page);

    await firstLogTradeButton(page).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: 'Close trade entry' }).click();

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
}
