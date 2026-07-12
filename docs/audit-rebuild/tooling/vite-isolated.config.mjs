import { mergeConfig } from 'vite';
import baseConfig from '../../../vite.config.js';

const productionSyncOrigin = 'https://tradevault-sync.talfishmanbusiness.workers.dev';

const auditGuard = `
(() => {
  const productionOrigin = ${JSON.stringify('https://tradevault-sync.talfishmanbusiness.workers.dev')};
  const nativeFetch = window.fetch.bind(window);
  const requests = [];
  const marker = document.createElement('meta');
  marker.name = 'tradevault-audit-mode';
  marker.content = 'isolated';
  marker.dataset.requestCount = '0';
  document.head.appendChild(marker);
  let remoteDataset = {
    version: 2,
    schemaVersion: 2,
    clientId: 'audit-fixture',
    initialEquity: 20000,
    trades: [],
    tombstones: [],
    lastModified: 0
  };

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
