import { useEffect, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { useFileStore } from '../store/fileStore';
import { fileApi } from '../lib/api';
import type { WSMessage } from '@vibecoder/shared';

export function useFileWatcher() {
  const setTree = useFileStore((s) => s.setTree);
  const setLoading = useFileStore((s) => s.setLoading);
  const setError = useFileStore((s) => s.setError);
  const setProjectDir = useFileStore((s) => s.setProjectDir);
  const initialFetchDone = useRef(false);

  // Fetch tree on mount
  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;

    async function fetchTree() {
      setLoading(true);
      setError(null);
      try {
        const { tree, projectDir } = await fileApi.getTree();
        setTree(tree);
        setProjectDir(projectDir);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTree();
  }, [setTree, setLoading, setError, setProjectDir]);

  // Listen for file change events via WS → re-fetch tree
  useWebSocket('files', (msg: WSMessage) => {
    if (msg.type === 'files:changed' || msg.type === 'files:treeRefresh') {
      // Re-fetch the full tree on any file system change
      fileApi.getTree().then(({ tree, projectDir }) => {
        setTree(tree);
        setProjectDir(projectDir);
      }).catch(() => {
        // Silently ignore — tree will refresh on next change
      });
    }
  });
}
