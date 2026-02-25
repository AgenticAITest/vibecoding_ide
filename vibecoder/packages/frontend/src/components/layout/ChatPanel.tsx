import { ChatView } from '../chat/ChatView';
import { ProjectSelector } from './ProjectSelector';
import './ChatPanel.css';

export function ChatPanel() {
  return (
    <div className="chat-panel">
      <div className="chat-panel__header">
        <div className="chat-panel__header-left">
          <img src="/logo.png" alt="Mobile Vibing" className="chat-panel__logo" />
          <span className="chat-panel__title">Mobile Vibing</span>
        </div>
        <ProjectSelector />
      </div>
      <ChatView />
    </div>
  );
}
