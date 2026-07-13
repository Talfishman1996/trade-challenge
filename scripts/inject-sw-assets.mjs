import { readdir, readFile, writeFile } from 'node:fs/promises';

const assetDirectory = new URL('../dist/assets/', import.meta.url);
const serviceWorkerPath = new URL('../dist/sw.js', import.meta.url);
const files = (await readdir(assetDirectory))
  .filter(file => !file.startsWith('._') && /\.(?:css|js)$/.test(file))
  .sort()
  .map(file => `/assets/${file}`);

const source = await readFile(serviceWorkerPath, 'utf8');
const marker = 'const BUILD_ASSETS = [/* INJECT_BUILD_ASSETS */];';
if (!source.includes(marker)) throw new Error('service worker asset marker is missing');

await writeFile(
  serviceWorkerPath,
  source.replace(marker, `const BUILD_ASSETS = ${JSON.stringify(files)};`)
);
