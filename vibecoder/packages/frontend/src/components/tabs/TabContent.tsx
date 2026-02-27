import type { Tab } from '@vibecoder/shared';
import { useTabStore } from '../../store/tabStore';
import { WelcomePage } from '../welcome/WelcomePage';
import { CodeEditor } from '../editor/CodeEditor';
import { ImageViewer } from '../editor/ImageViewer';
import { TerminalView } from '../terminal/TerminalView';
import { ProjectWizard } from '../wizard/ProjectWizard';
import { PreviewPanel } from '../preview/PreviewPanel';
import { GitPanel } from '../git/GitPanel';
import { ProjectList } from '../projects/ProjectList';
import { ConsolePanel } from '../console/ConsolePanel';

const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp',
]);

function isImageFile(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return IMAGE_EXTENSIONS.has(ext);
}

/**
 * Render a single tab's content.
 * Stateful tabs (terminal, preview, editor) must stay mounted when hidden
 * so they don't lose their state (PTY sessions, iframe, undo history).
 */
function renderTab(tab: Tab) {
  switch (tab.type) {
    case 'welcome':
      return <WelcomePage />;
    case 'editor':
      return isImageFile(tab.path!) ? <ImageViewer filePath={tab.path!} /> : <CodeEditor filePath={tab.path!} />;
    case 'terminal':
      return <TerminalView sessionId={tab.id} initialCommand={tab.initialCommand} />;
    case 'wizard':
      return <ProjectWizard />;
    case 'preview':
      return <PreviewPanel />;
    case 'git':
      return <GitPanel />;
    case 'projects':
      return <ProjectList />;
    case 'console':
      return <ConsolePanel />;
    default:
      return (
        <div style={{ padding: 'var(--space-6)', color: 'var(--text-muted)' }}>
          {tab.type} tab — coming soon
        </div>
      );
  }
}

export function TabContent() {
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);

  return (
    <>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            style={{
              display: isActive ? 'flex' : 'none',
              flexDirection: 'column',
              height: '100%',
              width: '100%',
              overflow: 'hidden',
            }}
          >
            {renderTab(tab)}
          </div>
        );
      })}
    </>
  );
}
