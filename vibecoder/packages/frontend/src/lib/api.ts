import type { FileNode, ProjectInfo, ParsedApi, ScaffoldConfig, GitStatus, GitLogEntry, GitBranch, AIImageAttachment } from '@vibecoder/shared';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || res.statusText);
  }
  return res.json();
}

function json(body: unknown): RequestInit {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

export const fileApi = {
  getTree: () =>
    request<{ tree: FileNode[]; projectDir: string }>('/api/files/tree'),

  readFile: (path: string) =>
    request<{ content: string; path: string }>(`/api/files/read?path=${encodeURIComponent(path)}`),

  writeFile: (path: string, content: string) =>
    request<{ ok: boolean }>('/api/files/write', json({ path, content })),

  createFile: (path: string, type: 'file' | 'directory', content?: string) =>
    request<{ ok: boolean }>('/api/files/create', json({ path, type, content })),

  deleteFile: (path: string) =>
    request<{ ok: boolean }>(`/api/files/delete?path=${encodeURIComponent(path)}`, { method: 'DELETE' }),

  renameFile: (oldPath: string, newPath: string) =>
    request<{ ok: boolean }>('/api/files/rename', json({ oldPath, newPath })),

  getProjectDir: () =>
    request<{ dir: string }>('/api/files/project-dir'),

  setProjectDir: (dir: string) =>
    request<{ ok: boolean; dir: string }>('/api/files/project-dir', json({ dir })),
};

export const projectApi = {
  list: () =>
    request<{ projects: ProjectInfo[]; activeDir: string }>('/api/projects'),

  validateName: (name: string) =>
    request<{ valid: boolean; error?: string }>('/api/projects/validate-name', json({ name })),

  parseApi: (spec: string) =>
    request<{ parsed: ParsedApi }>('/api/projects/parse-api', json({ spec })),

  fetchApiUrl: (url: string) =>
    request<{ parsed: ParsedApi; raw: string }>('/api/projects/fetch-api-url', json({ url })),

  create: (config: ScaffoldConfig) =>
    request<{ project: ProjectInfo }>('/api/projects', json(config)),

  delete: (name: string) =>
    request<{ ok: boolean }>(`/api/projects/${encodeURIComponent(name)}`, { method: 'DELETE' }),

  activate: (name: string) =>
    request<{ ok: boolean; path: string }>(`/api/projects/${encodeURIComponent(name)}/activate`, json({})),
};

export const uploadApi = {
  uploadImage: async (file: File): Promise<AIImageAttachment> => {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(body.error || res.statusText);
    }
    const data = await res.json();
    return {
      path: data.relativePath,
      originalName: data.originalName,
      mimeType: data.mimeType,
      size: data.size,
    };
  },
};

export const gitApi = {
  status: () =>
    request<GitStatus>('/api/git/status'),

  init: () =>
    request<{ ok: boolean }>('/api/git/init', json({})),

  stage: (paths: string[]) =>
    request<{ ok: boolean }>('/api/git/stage', json({ paths })),

  stageAll: () =>
    request<{ ok: boolean }>('/api/git/stage-all', json({})),

  unstage: (paths: string[]) =>
    request<{ ok: boolean }>('/api/git/unstage', json({ paths })),

  commit: (message: string) =>
    request<{ ok: boolean }>('/api/git/commit', json({ message })),

  push: () =>
    request<{ ok: boolean }>('/api/git/push', json({})),

  pull: () =>
    request<{ ok: boolean }>('/api/git/pull', json({})),

  log: (count = 20) =>
    request<{ log: GitLogEntry[] }>(`/api/git/log?count=${count}`),

  branches: () =>
    request<{ branches: GitBranch[] }>('/api/git/branches'),

  createBranch: (name: string) =>
    request<{ ok: boolean }>('/api/git/branch', json({ name })),

  checkout: (name: string) =>
    request<{ ok: boolean }>('/api/git/checkout', json({ name })),

  diff: (path?: string) =>
    request<{ diff: string }>(`/api/git/diff${path ? `?path=${encodeURIComponent(path)}` : ''}`),
};
