import { useTabStore } from '../../store/tabStore';
import { useWizardStore } from '../../store/wizardStore';
import './WelcomePage.css';

export function WelcomePage() {
  const openTab = useTabStore((s) => s.openTab);
  const resetWizard = useWizardStore((s) => s.reset);

  const focusChatInput = () => {
    const textarea = document.querySelector('.chat-input__textarea') as HTMLTextAreaElement | null;
    textarea?.focus();
  };

  const handleOpenProject = () => {
    openTab({ id: 'projects', type: 'projects', label: 'Projects', closable: true });
  };

  const handleCreateProject = () => {
    resetWizard();
    openTab({ id: 'wizard', type: 'wizard', label: 'New Project', closable: true });
  };

  return (
    <div className="welcome-page">
      <div className="welcome-page__content">
        <img src="/logo.png" alt="Mobile Vibing" className="welcome-page__logo" />
        <h1 className="welcome-page__title">Mobile Vibing</h1>
        <p className="welcome-page__subtitle">
          Build apps by chatting with AI. No coding experience needed.
        </p>
        <div className="welcome-page__actions">
          <button className="welcome-page__btn welcome-page__btn--primary" onClick={focusChatInput}>
            Start Chatting
          </button>
          <button className="welcome-page__btn welcome-page__btn--secondary" onClick={handleOpenProject}>
            Open Project
          </button>
          <button className="welcome-page__btn welcome-page__btn--secondary" onClick={handleCreateProject}>
            Create Project
          </button>
        </div>
        <div className="welcome-page__hints">
          <div className="welcome-page__hint">
            <span className="welcome-page__hint-key">Enter</span>
            <span>Send message</span>
          </div>
          <div className="welcome-page__hint">
            <span className="welcome-page__hint-key">Shift+Enter</span>
            <span>New line</span>
          </div>
          <div className="welcome-page__hint">
            <span className="welcome-page__hint-key">Ctrl+E</span>
            <span>Toggle files</span>
          </div>
        </div>
      </div>
    </div>
  );
}
