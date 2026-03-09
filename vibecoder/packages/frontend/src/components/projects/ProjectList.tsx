import { useState, useEffect, useCallback } from 'react';
import type { ProjectInfo } from '@vibecoder/shared';
import { projectApi, fileApi } from '../../lib/api';
import { useTabStore } from '../../store/tabStore';
import { useFileStore } from '../../store/fileStore';
import { useWizardStore } from '../../store/wizardStore';
import { ImportModal } from './ImportModal';
import './ProjectList.css';

export function ProjectList() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [activeDir, setActiveDir] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const openTab = useTabStore((s) => s.openTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const setActiveTab = useTabStore((s) => s.setActiveTab);
  const setTree = useFileStore((s) => s.setTree);
  const setProjectDir = useFileStore((s) => s.setProjectDir);
  const resetWizard = useWizardStore((s) => s.reset);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await projectApi.list();
      setProjects(data.projects);
      setActiveDir(data.activeDir);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleOpen = async (project: ProjectInfo) => {
    if (isActive(project)) return;
    try {
      setActivating(project.name);
      await projectApi.activate(project.name);
      const { tree, projectDir } = await fileApi.getTree();
      setTree(tree);
      setProjectDir(projectDir);
      setActiveDir(projectDir);
      closeTab('projects');
      setActiveTab('welcome');
    } catch (err: any) {
      alert(`Failed to open project: ${err.message}`);
    } finally {
      setActivating(null);
    }
  };

  const handleDelete = async (project: ProjectInfo) => {
    if (isActive(project)) return;
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    try {
      await projectApi.delete(project.name);
      fetchProjects();
    } catch (err: any) {
      alert(`Failed to delete project: ${err.message}`);
    }
  };

  const handleCreate = () => {
    resetWizard();
    openTab({ id: 'wizard', type: 'wizard', label: 'New Project', closable: true });
  };

  const isActive = (project: ProjectInfo) => {
    const normalizedActive = activeDir.replace(/\\/g, '/');
    const normalizedPath = project.path.replace(/\\/g, '/');
    return normalizedActive === normalizedPath;
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  if (loading) {
    return (
      <div className="project-list">
        <div className="project-list__loading">Loading projects…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="project-list">
        <div className="project-list__error">
          <p>{error}</p>
          <button className="project-list__btn project-list__btn--secondary" onClick={fetchProjects}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="project-list">
      <div className="project-list__header">
        <h2 className="project-list__title">Your Projects</h2>
        <span className="project-list__count">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
      </div>

      {projects.length === 0 ? (
        <div className="project-list__empty">
          <p>No projects yet. Create your first project to get started.</p>
        </div>
      ) : (
        <div className="project-list__grid">
          {projects.map((project) => {
            const active = isActive(project);
            const isActivating = activating === project.name;
            return (
              <div
                key={project.name}
                className={`project-list__card ${active ? 'project-list__card--active' : ''}`}
              >
                <div className="project-list__card-icon">
                  {active ? '●' : '○'}
                </div>
                <div className="project-list__card-info">
                  <span className="project-list__card-name">{project.name}</span>
                  <span className="project-list__card-date">Created {formatDate(project.createdAt)}</span>
                </div>
                <div className="project-list__card-actions">
                  {active ? (
                    <span className="project-list__badge">Active</span>
                  ) : (
                    <>
                      <button
                        className="project-list__btn project-list__btn--primary"
                        onClick={() => handleOpen(project)}
                        disabled={isActivating}
                      >
                        {isActivating ? 'Opening…' : 'Open'}
                      </button>
                      <button
                        className="project-list__btn project-list__btn--danger"
                        onClick={() => handleDelete(project)}
                        disabled={isActivating}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="project-list__footer">
        <button className="project-list__btn project-list__btn--secondary" onClick={handleCreate}>
          + Create New Project
        </button>
        <button className="project-list__btn project-list__btn--secondary" onClick={() => setShowImport(true)}>
          Import Project
        </button>
      </div>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={fetchProjects}
        />
      )}
    </div>
  );
}
