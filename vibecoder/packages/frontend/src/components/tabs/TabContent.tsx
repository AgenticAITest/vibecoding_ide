import type { Tab } from '@vibecoder/shared';
import { useTabStore } from '../../store/tabStore';
import { WelcomePage } from '../welcome/WelcomePage';
import { CodeEditor } from '../editor/CodeEditor';
import { TerminalView } from '../terminal/TerminalView';
import { ProjectWizard } from '../wizard/ProjectWizard';
import { PreviewPanel } from '../preview/PreviewPanel';
import { GitPanel } from '../git/GitPanel';
import { ProjectList } from '../projects/ProjectList';
import { ConsolePanel } from '../console/ConsolePanel';

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
      return <CodeEditor filePath={tab.path!} />;
    case 'terminal':
      return <TerminalView sessionId={tab.id} />;
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
        <div style={{ padding: 24, color: 'var(--text-muted)' }}>
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
