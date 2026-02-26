// IndexedDB wrapper for storing trade chart screenshots
// localStorage has a 5MB limit — IndexedDB handles binary blobs efficiently

const DB_NAME = 'tradevault-images';
const DB_VERSION = 1;
const STORE_NAME = 'images';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Store an image blob, returns the key
export async function saveImage(key, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, key);
    tx.oncomplete = () => resolve(key);
    tx.onerror = () => reject(tx.error);
  });
}

// Retrieve an image as a blob URL (caller must revoke when done)
export async function getImage(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => {
      if (req.result) {
        resolve(URL.createObjectURL(req.result));
      } else {
        resolve(null);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

// Delete a single image
export async function deleteImage(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Delete all images (used by clearTrades)
export async function clearAllImages() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Compress an image file to JPEG under maxKB size
export async function compressImage(file, maxKB = 200) {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Scale down if too large (max 1200px on longest side)
        const maxDim = 1200;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Binary search for quality that fits under maxKB
        let lo = 0.1, hi = 0.92, bestBlob = null;
        const tryQuality = (q) => {
          canvas.toBlob((blob) => {
            if (!blob) { resolve(bestBlob); return; }
            if (blob.size <= maxKB * 1024) {
              bestBlob = blob;
              if (q >= hi - 0.05) { resolve(blob); return; }
              lo = q;
            } else {
              hi = q;
            }
            if (hi - lo < 0.05) { resolve(bestBlob || blob); return; }
            tryQuality((lo + hi) / 2);
          }, 'image/jpeg', q);
        };
        tryQuality(0.7);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
