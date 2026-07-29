import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadCatalog() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'apk-catalog.json'), 'utf8'));
  } catch {
    return [];
  }
}

function publishedCatalog() {
  return loadCatalog().filter((entry) => entry.published === true);
}

export function isPublishedApk(filename) {
  return publishedCatalog().some((entry) => entry.file === filename);
}

export function createDownloadsRouter(publicDir) {
  const router = Router();
  const downloadsDir = path.join(publicDir, 'downloads');

  router.get('/', (_req, res) => {
    const catalog = publishedCatalog();
    let version = null;
    let builtAt = null;

    try {
      const manifest = JSON.parse(fs.readFileSync(path.join(downloadsDir, 'manifest.json'), 'utf8'));
      version = manifest.version ?? null;
      builtAt = manifest.builtAt ?? null;
    } catch {
      /* no manifest */
    }

    const downloads = catalog.map((entry) => {
      const filePath = path.join(downloadsDir, entry.file);
      if (!fs.existsSync(filePath)) {
        return { ...entry, available: false };
      }
      const stat = fs.statSync(filePath);
      return {
        ...entry,
        available: true,
        url: `/downloads/${entry.file}`,
        bytes: stat.size,
        updatedAt: stat.mtime.toISOString(),
      };
    });

    res.set('Cache-Control', 'no-store');
    res.json({
      ok: true,
      version,
      builtAt,
      downloads,
      availableCount: downloads.filter((item) => item.available).length,
    });
  });

  return router;
}
