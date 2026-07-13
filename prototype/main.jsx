import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.jsx';
import './ui/fonts.css';
import './ui/prototype.css';

const PRODUCTION_HOST = 'tradevault-b7t.pages.dev';
if (window.location.hostname === PRODUCTION_HOST) {
  throw new Error('Prototype isolation guard: this build cannot run on the production hostname.');
}

const originalFetch = window.fetch.bind(window);
window.fetch = (input, init) => {
  const url = new URL(typeof input === 'string' ? input : input.url, window.location.href);
  if (url.hostname === PRODUCTION_HOST || url.origin !== window.location.origin) {
    return Promise.reject(new Error(`Prototype isolation guard blocked ${url.origin}`));
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('prototype-root')).render(
  <React.StrictMode><App /></React.StrictMode>,
);
