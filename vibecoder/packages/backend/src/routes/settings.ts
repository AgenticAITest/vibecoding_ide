import { Router } from 'express';
import {
  getCachedDeps,
  forceRefreshDeps,
  getOrResolveDeps,
} from '../services/dependencyResolver.js';

export const settingsRouter = Router();

// Default SDK major version — this is the pinned major the scaffolder uses.
// Change this when deliberately upgrading to a new Expo SDK.
const DEFAULT_SDK_MAJOR = 52;

/**
 * GET /api/settings/expo-deps
 * Returns cached dependency info (or resolves if no cache exists).
 */
settingsRouter.get('/expo-deps', async (_req, res) => {
  try {
    const deps = await getOrResolveDeps(DEFAULT_SDK_MAJOR);
    res.json({ deps, stale: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to get Expo dependencies' });
  }
});

/**
 * POST /api/settings/refresh-expo-deps
 * Force-refreshes dependency versions from npm registry.
 */
settingsRouter.post('/refresh-expo-deps', async (_req, res) => {
  try {
    const deps = await forceRefreshDeps(DEFAULT_SDK_MAJOR);
    res.json({ deps, refreshed: true });
  } catch (err: any) {
    // On failure, return cached if available
    const cached = await getCachedDeps(DEFAULT_SDK_MAJOR);
    res.status(502).json({
      error: err.message || 'Failed to fetch from npm registry',
      deps: cached,
      refreshed: false,
    });
  }
});
