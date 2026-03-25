import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cache file lives next to the backend package
const CACHE_DIR = path.resolve(__dirname, '..', '..', '.cache');
const CACHE_FILE = (major: number) => path.join(CACHE_DIR, `expo-deps-sdk${major}.json`);

// Cache TTL: 24 hours (for automatic staleness checks)
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Resolved dependency versions for an Expo SDK major */
export interface ResolvedExpoDeps {
  sdkMajor: number;
  expoVersion: string;
  react: string;
  reactDom: string;
  reactNative: string;
  /** Expo sub-package compatible versions from bundledNativeModules.json */
  bundledModules: Record<string, string>;
  resolvedAt: string; // ISO timestamp
}

// ---------- Hardcoded fallback for SDK 52 ----------
// These are known-good versions as of early 2026.
const FALLBACK_SDK52: ResolvedExpoDeps = {
  sdkMajor: 52,
  expoVersion: '52.0.20',
  react: '18.3.1',
  reactDom: '18.3.1',
  reactNative: '0.76.6',
  bundledModules: {
    'expo-router': '~4.0.0',
    'expo-status-bar': '~2.0.0',
    'expo-linking': '~7.0.0',
    'expo-constants': '~17.0.0',
    'expo-asset': '~11.0.0',
    '@expo/metro-runtime': '~4.0.0',
    '@expo/vector-icons': '^14.0.0',
    'react-native-web': '~0.19.13',
    'react-native-safe-area-context': '4.14.1',
    'react-native-screens': '~4.4.0',
    '@react-navigation/native': '^7.0.0',
  },
  resolvedAt: '2026-01-01T00:00:00.000Z',
};

const FALLBACKS: Record<number, ResolvedExpoDeps> = {
  52: FALLBACK_SDK52,
};

// ---------- npm registry helpers ----------

async function fetchJson(url: string, headers?: Record<string, string>): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', ...headers },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

/**
 * Find the latest version matching a given major from the npm registry.
 * Uses abbreviated metadata to keep the payload small.
 */
async function findLatestPatch(packageName: string, sdkMajor: number): Promise<string> {
  const data = await fetchJson(`https://registry.npmjs.org/${packageName}`, {
    Accept: 'application/vnd.npm.install-v1+json',
  }) as { versions?: Record<string, unknown> };

  if (!data.versions) throw new Error('No versions found in registry response');

  const prefix = `${sdkMajor}.`;
  const matching = Object.keys(data.versions)
    .filter((v) => v.startsWith(prefix) && !v.includes('-')) // exclude prereleases
    .sort(compareSemver);

  if (matching.length === 0) {
    throw new Error(`No versions found for ${packageName} SDK ${sdkMajor}`);
  }

  return matching[matching.length - 1]; // highest version
}

/** Simple semver compare for sorting (major.minor.patch only) */
function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

/**
 * Fetch the full package.json for a specific expo version to extract
 * react / react-dom / react-native versions from dependencies + peerDependencies.
 */
async function fetchCoreDeps(expoVersion: string): Promise<{
  react: string;
  reactDom: string;
  reactNative: string;
}> {
  const data = await fetchJson(
    `https://registry.npmjs.org/expo/${expoVersion}`
  ) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };

  const deps = { ...data.peerDependencies, ...data.dependencies };

  // Extract exact versions — strip semver range prefixes
  const stripRange = (v: string | undefined) => v?.replace(/^[~^>=<\s]+/, '') || '';

  const react = stripRange(deps['react']);
  const reactNative = stripRange(deps['react-native']);
  // react-dom should match react version
  const reactDom = stripRange(deps['react-dom']) || react;

  if (!react || !reactNative) {
    throw new Error(`Could not extract react/react-native from expo@${expoVersion}`);
  }

  return { react, reactDom, reactNative };
}

/**
 * Fetch bundledNativeModules.json from unpkg CDN for the given expo version.
 */
async function fetchBundledModules(expoVersion: string): Promise<Record<string, string>> {
  try {
    const data = await fetchJson(
      `https://unpkg.com/expo@${expoVersion}/bundledNativeModules.json`
    ) as Record<string, string>;
    return data;
  } catch {
    // Fallback: try GitHub raw
    const major = expoVersion.split('.')[0];
    const data = await fetchJson(
      `https://raw.githubusercontent.com/expo/expo/sdk-${major}/packages/expo/bundledNativeModules.json`
    ) as Record<string, string>;
    return data;
  }
}

// ---------- Cache management ----------

async function ensureCacheDir(): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

async function readCache(sdkMajor: number): Promise<ResolvedExpoDeps | null> {
  try {
    const raw = await fs.readFile(CACHE_FILE(sdkMajor), 'utf-8');
    const parsed = JSON.parse(raw) as ResolvedExpoDeps;
    // Validate basic shape
    if (parsed.expoVersion && parsed.react && parsed.reactNative) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeCache(deps: ResolvedExpoDeps): Promise<void> {
  await ensureCacheDir();
  await fs.writeFile(CACHE_FILE(deps.sdkMajor), JSON.stringify(deps, null, 2), 'utf-8');
}

function isCacheStale(deps: ResolvedExpoDeps): boolean {
  const age = Date.now() - new Date(deps.resolvedAt).getTime();
  return age > CACHE_TTL_MS;
}

// ---------- Public API ----------

/**
 * Resolve the latest compatible dependencies for an Expo SDK major version.
 * Fetches from npm registry + unpkg, then caches locally.
 */
export async function resolveExpoDeps(sdkMajor: number): Promise<ResolvedExpoDeps> {
  console.log(`[DepResolver] Resolving latest deps for Expo SDK ${sdkMajor}...`);

  // 1. Find latest patch version
  const expoVersion = await findLatestPatch('expo', sdkMajor);
  console.log(`[DepResolver] Latest expo@${sdkMajor}.x → ${expoVersion}`);

  // 2. Get core dependency versions
  const { react, reactDom, reactNative } = await fetchCoreDeps(expoVersion);
  console.log(`[DepResolver] Core deps: react=${react}, react-dom=${reactDom}, react-native=${reactNative}`);

  // 3. Get bundled native modules
  const bundledModules = await fetchBundledModules(expoVersion);
  console.log(`[DepResolver] Fetched ${Object.keys(bundledModules).length} bundled module versions`);

  const resolved: ResolvedExpoDeps = {
    sdkMajor,
    expoVersion,
    react,
    reactDom,
    reactNative,
    bundledModules,
    resolvedAt: new Date().toISOString(),
  };

  // 4. Cache
  await writeCache(resolved);
  console.log(`[DepResolver] Cached to ${CACHE_FILE(sdkMajor)}`);

  return resolved;
}

/**
 * Get cached deps, resolving from network if cache is missing or stale.
 * Falls back to hardcoded defaults on network failure.
 */
export async function getOrResolveDeps(sdkMajor: number): Promise<ResolvedExpoDeps> {
  // Try cache first
  const cached = await readCache(sdkMajor);
  if (cached && !isCacheStale(cached)) {
    console.log(`[DepResolver] Using cached deps for SDK ${sdkMajor} (resolved ${cached.resolvedAt})`);
    return cached;
  }

  // Cache missing or stale — try network
  try {
    return await resolveExpoDeps(sdkMajor);
  } catch (err) {
    console.error(`[DepResolver] Network resolution failed:`, err);

    // If we have stale cache, use it (better than nothing)
    if (cached) {
      console.warn(`[DepResolver] Using stale cache from ${cached.resolvedAt}`);
      return cached;
    }

    // Last resort: hardcoded fallback
    const fallback = FALLBACKS[sdkMajor];
    if (fallback) {
      console.warn(`[DepResolver] Using hardcoded fallback for SDK ${sdkMajor}`);
      return fallback;
    }

    throw new Error(`No cached or fallback deps available for Expo SDK ${sdkMajor}`);
  }
}

/**
 * Get cached deps only (no network). Returns null if no cache exists.
 */
export async function getCachedDeps(sdkMajor: number): Promise<ResolvedExpoDeps | null> {
  const cached = await readCache(sdkMajor);
  return cached || FALLBACKS[sdkMajor] || null;
}

/**
 * Force refresh: always fetches from network, updates cache.
 * Throws on network failure (caller should handle).
 */
export async function forceRefreshDeps(sdkMajor: number): Promise<ResolvedExpoDeps> {
  return resolveExpoDeps(sdkMajor);
}
