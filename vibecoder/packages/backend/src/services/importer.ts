import fs from 'fs/promises';
import path from 'path';
import AdmZip from 'adm-zip';
import { simpleGit } from 'simple-git';
import type { ProjectFramework } from '@vibecoder/shared';

/**
 * Detect framework by inspecting project files.
 * - pubspec.yaml at root → Flutter
 * - app.json or expo config → Expo
 * - Falls back to 'expo'
 */
export async function detectFramework(projectDir: string): Promise<ProjectFramework> {
  try {
    await fs.access(path.join(projectDir, 'pubspec.yaml'));
    return 'flutter';
  } catch {
    // not flutter
  }
  return 'expo';
}

/**
 * Import a ZIP file into a user's project directory.
 * If the ZIP contains a single root directory, unwrap it.
 */
export async function importZip(
  zipBuffer: Buffer,
  targetDir: string
): Promise<{ framework: ProjectFramework }> {
  // Create fresh — remove any leftover from a previous failed attempt
  await fs.rm(targetDir, { recursive: true, force: true });
  await fs.mkdir(targetDir, { recursive: true });

  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  // Detect if all entries share a single root directory (common in GitHub ZIPs)
  const topLevelNames = new Set<string>();
  for (const entry of entries) {
    const firstSegment = entry.entryName.split('/')[0];
    topLevelNames.add(firstSegment);
  }

  const singleRoot = topLevelNames.size === 1;
  const rootPrefix = singleRoot ? [...topLevelNames][0] + '/' : '';

  for (const entry of entries) {
    let entryPath = entry.entryName;

    // Strip single root directory prefix
    if (singleRoot && entryPath.startsWith(rootPrefix)) {
      entryPath = entryPath.slice(rootPrefix.length);
    }

    if (!entryPath) continue;

    const fullPath = path.join(targetDir, entryPath);

    // Path traversal check
    if (!path.normalize(fullPath).startsWith(path.normalize(targetDir))) {
      continue; // skip malicious entries
    }

    if (entry.isDirectory) {
      await fs.mkdir(fullPath, { recursive: true });
    } else {
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, entry.getData());
    }
  }

  const framework = await detectFramework(targetDir);
  return { framework };
}

/**
 * Clone a git repository into a user's project directory.
 */
export async function importGit(
  url: string,
  targetDir: string,
  token?: string
): Promise<{ framework: ProjectFramework }> {
  // Validate URL scheme to prevent local file access (file://, /path, etc.)
  if (!url.startsWith('https://') && !url.startsWith('git@')) {
    throw new Error('Only HTTPS and SSH git URLs are supported');
  }

  // Clean up any leftover from a previous failed attempt
  await fs.rm(targetDir, { recursive: true, force: true });

  // If a PAT is provided, inject it into the URL for HTTPS clones
  let cloneUrl = url;
  if (token && url.startsWith('https://')) {
    const parsed = new URL(url);
    parsed.username = 'oauth2';
    parsed.password = token;
    cloneUrl = parsed.toString();
  }

  const git = simpleGit();
  try {
    await git.clone(cloneUrl, targetDir);
  } catch (err) {
    // Clean up empty directory left by failed clone
    await fs.rm(targetDir, { recursive: true, force: true }).catch(() => {});
    throw err;
  }

  const framework = await detectFramework(targetDir);
  return { framework };
}
