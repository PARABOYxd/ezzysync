/**
 * Loads the application's CommonJS modules from an ESM test file.
 *
 * Vitest runs tests as ES modules; the server is CommonJS and stays that way.
 * createRequire is the bridge, and keeping it in one place means a test file
 * reads as a test rather than as module plumbing.
 */
import { createRequire } from 'node:module';

export const appRequire = createRequire(import.meta.url);

export const db = appRequire('../config/db');
export const helpers = appRequire('./helpers.js');
