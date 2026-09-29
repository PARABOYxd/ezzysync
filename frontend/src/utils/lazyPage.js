import { lazy } from 'react';

const RELOAD_KEY = 'ezzy_chunk_reload_at';

/**
 * React.lazy for a route page, safe across deploys.
 *
 * Each page is its own file now, so a tab that stayed open through a deploy
 * asks for chunk names that no longer exist and the import fails ("Failed to
 * fetch dynamically imported module"). Reloading once picks up the new build;
 * the timestamp stops a genuinely broken chunk from reloading forever.
 */
export default function lazyPage(importer) {
  return lazy(async () => {
    try {
      return await importer();
    } catch (err) {
      let last = 0;
      try { last = Number(sessionStorage.getItem(RELOAD_KEY) || 0); } catch { /* storage blocked */ }
      if (Date.now() - last > 30_000) {
        try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* storage blocked */ }
        window.location.reload();
        return new Promise(() => {}); // the reload replaces the page
      }
      throw err;
    }
  });
}
