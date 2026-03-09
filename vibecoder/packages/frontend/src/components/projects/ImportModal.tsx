import { useState, useRef } from 'react';
import { projectApi, fileApi } from '../../lib/api';
import { useTabStore } from '../../store/tabStore';
import { useFileStore } from '../../store/fileStore';
import './ImportModal.css';

interface ImportModalProps {
  onClose: () => void;
  onImported: () => void;
}

type ImportTab = 'zip' | 'git';

export function ImportModal({ onClose, onImported }: ImportModalProps) {
  const [activeTab, setActiveTab] = useState<ImportTab>('zip');
  const [name, setName] = useState('');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [gitUrl, setGitUrl] = useState('');
  const [gitToken, setGitToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const closeTab = useTabStore((s) => s.closeTab);
  const setActiveTabStore = useTabStore((s) => s.setActiveTab);
  const setTree = useFileStore((s) => s.setTree);
  const setProjectDir = useFileStore((s) => s.setProjectDir);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setZipFile(file);

    // Auto-fill name from filename if empty
    if (!name) {
      const derived = file.name.replace(/\.zip$/i, '').replace(/[^a-zA-Z0-9_-]/g, '-');
      setName(derived);
    }
  };

  const handleGitUrlChange = (url: string) => {
    setGitUrl(url);

    // Auto-fill name from repo URL if empty
    if (!name) {
      const derived = url.split('/').pop()?.replace(/\.git$/, '') || '';
      if (derived) setName(derived);
    }
  };

  const handleImport = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    try {
      if (activeTab === 'zip') {
        if (!zipFile) {
          setError('Please select a ZIP file');
          setLoading(false);
          return;
        }
        await projectApi.importZip(zipFile, name.trim());
      } else {
        if (!gitUrl.trim()) {
          setError('Repository URL is required');
          setLoading(false);
          return;
        }
        await projectApi.importGit(gitUrl.trim(), name.trim() || undefined, gitToken.trim() || undefined);
      }

      // Refresh file tree with the newly activated project
      const { tree, projectDir } = await fileApi.getTree();
      setTree(tree);
      setProjectDir(projectDir);
      closeTab('projects');
      setActiveTabStore('welcome');
      onImported();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="import-modal__overlay" onClick={onClose}>
      <div className="import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="import-modal__header">
          <h3 className="import-modal__title">Import Project</h3>
          <button className="import-modal__close" onClick={onClose}>&times;</button>
        </div>

        <div className="import-modal__tabs">
          <button
            className={`import-modal__tab ${activeTab === 'zip' ? 'import-modal__tab--active' : ''}`}
            onClick={() => { setActiveTab('zip'); setError(null); }}
          >
            Upload ZIP
          </button>
          <button
            className={`import-modal__tab ${activeTab === 'git' ? 'import-modal__tab--active' : ''}`}
            onClick={() => { setActiveTab('git'); setError(null); }}
          >
            Clone from GitHub
          </button>
        </div>

        <div className="import-modal__body">
          <label className="import-modal__label">
            Project Name
            <input
              className="import-modal__input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="my-awesome-app"
              disabled={loading}
            />
          </label>

          {activeTab === 'zip' ? (
            <div className="import-modal__section">
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button
                className="import-modal__file-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                {zipFile ? zipFile.name : 'Choose .zip file'}
              </button>
              {zipFile && (
                <span className="import-modal__file-info">
                  {(zipFile.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              )}
            </div>
          ) : (
            <>
              <label className="import-modal__label">
                Repository URL
                <input
                  className="import-modal__input"
                  type="text"
                  value={gitUrl}
                  onChange={(e) => handleGitUrlChange(e.target.value)}
                  placeholder="https://github.com/user/repo.git"
                  disabled={loading}
                />
              </label>
              <label className="import-modal__label">
                <span>
                  Access Token <span className="import-modal__optional">(optional, for private repos)</span>
                </span>
                <input
                  className="import-modal__input"
                  type="password"
                  value={gitToken}
                  onChange={(e) => setGitToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  disabled={loading}
                />
              </label>
            </>
          )}

          {error && <div className="import-modal__error">{error}</div>}
        </div>

        <div className="import-modal__footer">
          <button
            className="import-modal__btn import-modal__btn--secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="import-modal__btn import-modal__btn--primary"
            onClick={handleImport}
            disabled={loading}
          >
            {loading ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}
