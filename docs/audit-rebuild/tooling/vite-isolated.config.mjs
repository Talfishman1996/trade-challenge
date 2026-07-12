import { mergeConfig } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import baseConfig from '../../../vite.config.js';

const productionSyncOrigin = 'https://tradevault-sync.talfishmanbusiness.workers.dev';
const fixtureDir = resolve('output/audit-rebuild/P1/fixtures');

const fixtureCatalog = (() => {
  try {
    return Object.fromEntries(
      readdirSync(fixtureDir)
        .filter(name => /^S\d{2}_[a-z0-9_]+\.json$/i.test(name))
        .map(name => [name.replace(/\.json$/, ''), JSON.parse(readFileSync(resolve(fixtureDir, name), 'utf8'))])
    );
  } catch {
    return {};
  }
})();

const auditGuard = `
(() => {
  const productionOrigin = ${JSON.stringify('https://tradevault-sync.talfishmanbusiness.workers.dev')};
  const nativeFetch = window.fetch.bind(window);
  const requests = [];
  const params = new URL(window.location.href).searchParams;
  const fixtureName = params.get('auditFixture') || '';
  const remoteFixtureName = params.get('auditRemoteFixture') || fixtureName;
  const syncMode = params.get('auditSync') || 'ready';
  const dailyLimit = Number(params.get('auditDailyLimit') || 0);
  const textScale = params.get('auditText') || '100';
  const reducedMotion = params.get('auditMotion') === 'reduced';
  const fixtures = ${JSON.stringify(fixtureCatalog)};
  const selectedFixture = fixtures[fixtureName] || null;
  const selectedRemoteFixture = fixtures[remoteFixtureName] || selectedFixture;
  const marker = document.createElement('meta');
  marker.name = 'tradevault-audit-mode';
  marker.content = 'isolated';
  marker.dataset.requestCount = '0';
  marker.dataset.fixture = fixtureName || 'default-empty';
  marker.dataset.remoteFixture = remoteFixtureName || 'default-empty';
  marker.dataset.syncMode = syncMode;
  marker.dataset.textScale = textScale;
  marker.dataset.reducedMotion = String(reducedMotion);
  document.head.appendChild(marker);

  const runtimeMetrics = {
    cls: 0,
    lcp: null,
    longTasks: [],
    paints: [],
    navigation: null,
    resources: null
  };
  const publishRuntimeMetrics = () => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    runtimeMetrics.navigation = navigation ? {
      domContentLoaded: navigation.domContentLoadedEventEnd,
      load: navigation.loadEventEnd,
      responseEnd: navigation.responseEnd,
      transferSize: navigation.transferSize,
      decodedBodySize: navigation.decodedBodySize
    } : null;
    runtimeMetrics.paints = performance.getEntriesByType('paint').map(entry => ({
      name: entry.name,
      startTime: entry.startTime
    }));
    runtimeMetrics.resources = {
      count: resources.length,
      transferSize: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0),
      decodedBodySize: resources.reduce((sum, entry) => sum + (entry.decodedBodySize || 0), 0),
      duration: resources.reduce((sum, entry) => sum + (entry.duration || 0), 0)
    };
    marker.dataset.metrics = JSON.stringify(runtimeMetrics);
  };

  try {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        runtimeMetrics.lcp = { startTime: entry.startTime, size: entry.size || 0 };
      }
      publishRuntimeMetrics();
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}

  try {
    new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) runtimeMetrics.cls += entry.value;
      }
      publishRuntimeMetrics();
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {}

  try {
    new PerformanceObserver(list => {
      runtimeMetrics.longTasks.push(...list.getEntries().map(entry => ({
        startTime: entry.startTime,
        duration: entry.duration
      })));
      publishRuntimeMetrics();
    }).observe({ type: 'longtask', buffered: true });
  } catch {}

  window.addEventListener('load', () => {
    publishRuntimeMetrics();
    setTimeout(publishRuntimeMetrics, 1500);
  });

  if (syncMode === 'offline') {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
  }

  if (textScale === '200') {
    document.documentElement.style.webkitTextSizeAdjust = '200%';
    document.documentElement.style.textSizeAdjust = '200%';
  }

  if (reducedMotion) {
    const nativeMatchMedia = window.matchMedia.bind(window);
    window.matchMedia = query => query === '(prefers-reduced-motion: reduce)'
      ? { matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; } }
      : nativeMatchMedia(query);
  }
  const emptyDataset = {
    version: 2,
    schemaVersion: 2,
    clientId: 'audit-fixture',
    initialEquity: 20000,
    trades: [],
    tombstones: [],
    lastModified: 0
  };
  let remoteDataset = selectedRemoteFixture
    ? JSON.parse(JSON.stringify(selectedRemoteFixture))
    : emptyDataset;

  if (selectedFixture) {
    localStorage.setItem('risk-engine-data', JSON.stringify(selectedFixture));
    localStorage.setItem('risk-engine-settings', JSON.stringify({
      winRate: 70,
      rewardRatio: 1,
      initialEquity: selectedFixture.initialEquity,
      drawdownAlertPct: 20,
      maxRiskPct: 0,
      tiltLockEnabled: true,
      tiltLockThreshold: 3,
      tiltCooldownMinutes: 15,
      dailyLossLimit: Number.isFinite(dailyLimit) ? dailyLimit : 0,
      rMultipleDisplay: false
    }));
    localStorage.removeItem('tradevault-sync-activity');
  } else if (fixtureName === 'S00_first_launch') {
    localStorage.removeItem('risk-engine-data');
    localStorage.removeItem('risk-engine-settings');
    localStorage.removeItem('tradevault-sync');
    localStorage.removeItem('tradevault-sync-activity');
  }

  window.fetch = async (input, init = {}) => {
    const requestUrl = typeof input === 'string' ? input : input?.url;
    if (!requestUrl || !requestUrl.startsWith(productionOrigin)) {
      return nativeFetch(input, init);
    }

    const method = String(init.method || 'GET').toUpperCase();
    requests.push({ method, url: requestUrl, at: Date.now() });
    marker.dataset.requestCount = String(requests.length);
    marker.dataset.lastMethod = method;
    marker.dataset.lastPath = new URL(requestUrl).pathname;

    if (syncMode === 'error') {
      return new Response(JSON.stringify({ error: 'Audit fixture forced sync failure' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (syncMode === 'slow') {
      await new Promise(resolveDelay => setTimeout(resolveDelay, 2500));
    }

    if (method === 'POST') {
      remoteDataset = { ...JSON.parse(init.body || '{}'), clientId: 'audit-fixture' };
      return new Response(JSON.stringify({ id: 'audit-fixture' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (method === 'PUT') {
      remoteDataset = { ...JSON.parse(init.body || '{}'), clientId: 'audit-fixture' };
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (method === 'GET') {
      return new Response(JSON.stringify(remoteDataset), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Blocked by TradeVault audit harness' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  };

  Object.defineProperties(window, {
    __TRADEVAULT_AUDIT_MODE__: { value: true, enumerable: false },
    __TRADEVAULT_AUDIT_PRODUCTION_ORIGIN__: { value: productionOrigin, enumerable: false },
    __TRADEVAULT_AUDIT_REQUESTS__: { value: requests, enumerable: false }
  });
})();
`;

const auditIsolationPlugin = {
  name: 'tradevault-audit-isolation',
  transformIndexHtml: {
    order: 'pre',
    handler() {
      return [{ tag: 'script', children: auditGuard, injectTo: 'head-prepend' }];
    }
  }
};

export default mergeConfig(baseConfig, {
  plugins: [auditIsolationPlugin],
  server: {
    host: '127.0.0.1',
    port: 4174,
    strictPort: true,
    open: false
  },
  define: {
    __TRADEVAULT_AUDIT_PRODUCTION_SYNC_ORIGIN__: JSON.stringify(productionSyncOrigin)
  }
});
