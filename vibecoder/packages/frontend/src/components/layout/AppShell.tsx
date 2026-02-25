import { useEffect } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
import { ChatPanel } from './ChatPanel';
import { CenterPanel } from './CenterPanel';
import { FileTreePanel } from './FileTreePanel';
import { StatusBar } from './StatusBar';
import { useUIStore } from '../../store/uiStore';
import { useFileStore } from '../../store/fileStore';
import { useConsoleListener } from '../../hooks/useConsoleListener';
import { fileApi } from '../../lib/api';
import './AppShell.css';

export function AppShell() {
  useConsoleListener();
  const fileTreeVisible = useUIStore((s) => s.fileTreeVisible);
  const setTree = useFileStore((s) => s.setTree);
  const setProjectDir = useFileStore((s) => s.setProjectDir);

  // Fetch active project on mount so the selector shows the correct project after refresh
  useEffect(() => {
    fileApi.getTree()
      .then(({ tree, projectDir }) => {
        setTree(tree);
        setProjectDir(projectDir);
      })
      .catch(() => { /* backend not ready yet — will load on next interaction */ });
  }, [setTree, setProjectDir]);

  return (
    <div className="app-shell">
      <div className="app-shell__main">
        <Allotment>
          <Allotment.Pane minSize={280} maxSize={500} preferredSize={340}>
            <ChatPanel />
          </Allotment.Pane>
          <Allotment.Pane>
            <CenterPanel />
          </Allotment.Pane>
          {fileTreeVisible && (
            <Allotment.Pane minSize={180} maxSize={400} preferredSize={240} snap>
              <FileTreePanel />
            </Allotment.Pane>
          )}
        </Allotment>
      </div>
      <StatusBar />
    </div>
  );
}
