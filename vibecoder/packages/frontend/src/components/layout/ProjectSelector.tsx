import { useState, useRef, useEffect } from 'react';
import { useFileStore } from '../../store/fileStore';
import { projectApi, fileApi } from '../../lib/api';
import type { ProjectInfo } from '@vibecoder/shared';

export function ProjectSelector() {
  const projectDir = useFileStore((s) => s.projectDir);
  const setTree = useFileStore((s) => s.setTree);
  const setProjectDir = useFileStore((s) => s.setProjectDir);

  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Extract project name from path
  const projectName = projectDir ? projectDir.replace(/\\/g, '/').split('/').pop() || '' : '';

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    setLoading(true);
    try {
      const { projects: list } = await projectApi.list();
      setProjects(list);
    } catch {
      // silently fail — dropdown just shows empty
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (project: ProjectInfo) => {
    if (project.path === projectDir) {
      setOpen(false);
      return;
    }
    try {
      setActivating(project.name);
      await projectApi.activate(project.name);
      const { tree, projectDir: newDir } = await fileApi.getTree();
      setTree(tree);
      setProjectDir(newDir);
      setOpen(false);
    } catch (err: any) {
      alert(`Failed to switch project: ${err.message}`);
    } finally {
      setActivating(null);
    }
  };

  return (
    <div className="project-selector" ref={ref}>
      <button className="project-selector__trigger" onClick={handleToggle}>
        <span className="project-selector__name">
          {projectName || 'No project'}
        </span>
        <svg className="project-selector__chevron" width="10" height="10" viewBox="0 0 10 10">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="project-selector__dropdown">
          {loading ? (
            <div className="project-selector__loading">Loading…</div>
          ) : projects.length === 0 ? (
            <div className="project-selector__empty">No projects</div>
          ) : (
            projects.map((p) => {
              const isActive = p.path === projectDir;
              const isSwitching = activating === p.name;
              return (
                <button
                  key={p.name}
                  className={`project-selector__item${isActive ? ' project-selector__item--active' : ''}`}
                  onClick={() => handleSelect(p)}
                  disabled={isSwitching}
                >
                  <span className="project-selector__dot">{isActive ? '●' : ''}</span>
                  <span>{p.name}</span>
                  {isSwitching && <span className="project-selector__spinner">…</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
