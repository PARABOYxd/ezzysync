/**
 * One bridge from this ESM harness into the backend's CommonJS world.
 *
 * Everything the matrix needs - the app's own middleware, its routers, its
 * config, plus supertest and express themselves - is resolved from
 * `backend/`, so the harness tests the dependency tree that actually ships
 * rather than a second copy installed next to it.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

export const QA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const ROOT_DIR = path.resolve(QA_DIR, '..');
export const BACKEND_DIR = path.join(ROOT_DIR, 'backend');

/** Resolves as if we were a file sitting inside backend/. */
export const backendRequire = createRequire(pathToFileURL(path.join(BACKEND_DIR, 'qa-harness.js')));
