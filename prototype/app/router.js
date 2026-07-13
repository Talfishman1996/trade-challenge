import { useEffect, useState } from 'react';

const VALID_PATHS = new Set([
  '/prototype/today',
  '/prototype/journal',
  '/prototype/insights/performance',
  '/prototype/insights/review',
  '/prototype/insights/plan',
  '/prototype/system',
  '/prototype/system/sync',
  '/prototype/review',
]);

function normalizedLocation() {
  const pathname = VALID_PATHS.has(window.location.pathname) ? window.location.pathname : '/prototype/today';
  return { pathname, search: window.location.search };
}

export function navigate(pathname, options = {}) {
  const url = new URL(window.location.href);
  url.pathname = VALID_PATHS.has(pathname) ? pathname : '/prototype/today';
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value === null || value === undefined || value === '') url.searchParams.delete(key);
      else url.searchParams.set(key, String(value));
    }
  }
  window.history[options.replace ? 'replaceState' : 'pushState']({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function useRoute() {
  const [route, setRoute] = useState(normalizedLocation);
  useEffect(() => {
    if (!VALID_PATHS.has(window.location.pathname)) navigate('/prototype/today', { replace: true });
    const update = () => setRoute(normalizedLocation());
    window.addEventListener('popstate', update);
    return () => window.removeEventListener('popstate', update);
  }, []);
  return route;
}

export function routeSection(pathname) {
  if (pathname.includes('/journal')) return 'journal';
  if (pathname.includes('/insights')) return 'insights';
  if (pathname.includes('/system')) return 'system';
  if (pathname.includes('/review')) return 'review';
  return 'today';
}
