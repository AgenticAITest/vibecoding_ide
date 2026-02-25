import { useCallback } from 'react';
import { useWizardStore } from '../../store/wizardStore';
import { useTabStore } from '../../store/tabStore';
import { useFileStore } from '../../store/fileStore';
import { useUIStore } from '../../store/uiStore';
import { projectApi, fileApi } from '../../lib/api';
import { StepName } from './StepName';
import { StepApi } from './StepApi';
import { StepDesign } from './StepDesign';
import { StepHtmlImport } from './StepHtmlImport';
import { StepReview } from './StepReview';
import type { WizardStep } from '@vibecoder/shared';
import './ProjectWizard.css';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'name', label: 'Name' },
  { key: 'api', label: 'API' },
  { key: 'design', label: 'Design' },
  { key: 'html-import', label: 'HTML/CSS' },
  { key: 'review', label: 'Review' },
];

function stepIndex(step: WizardStep): number {
  return STEPS.findIndex((s) => s.key === step);
}

export function ProjectWizard() {
  const step = useWizardStore((s) => s.step);
  const setStep = useWizardStore((s) => s.setStep);
  const projectName = useWizardStore((s) => s.projectName);
  const apiSpec = useWizardStore((s) => s.apiSpec);
  const apiSpecRaw = useWizardStore((s) => s.apiSpecRaw);
  const logoBase64 = useWizardStore((s) => s.logoBase64);
  const colors = useWizardStore((s) => s.colors);
  const designFiles = useWizardStore((s) => s.designFiles);
  const isCreating = useWizardStore((s) => s.isCreating);
  const setIsCreating = useWizardStore((s) => s.setIsCreating);
  const setError = useWizardStore((s) => s.setError);
  const reset = useWizardStore((s) => s.reset);

  const openTab = useTabStore((s) => s.openTab);
  const closeTab = useTabStore((s) => s.closeTab);
  const setTree = useFileStore((s) => s.setTree);
  const setProjectDir = useFileStore((s) => s.setProjectDir);
  const showFileTree = useUIStore((s) => s.showFileTree);

  const currentIdx = stepIndex(step);

  const canGoNext = useCallback(() => {
    if (step === 'name') return projectName.trim().length >= 3;
    return true;
  }, [step, projectName]);

  const handleNext = () => {
    if (currentIdx < STEPS.length - 1) {
      setStep(STEPS[currentIdx + 1].key);
    }
  };

  const handleBack = () => {
    if (currentIdx > 0) {
      setStep(STEPS[currentIdx - 1].key);
    }
  };

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);
    try {
      await projectApi.create({
        projectName: projectName.trim(),
        apiSpec,
        apiSpecRaw,
        logoBase64,
        colors,
        designFiles,
      });

      // Refresh file tree with the new project
      const { tree, projectDir } = await fileApi.getTree();
      setTree(tree);
      setProjectDir(projectDir);

      // Show file tree so user can see the scaffolded project
      showFileTree();

      // Open the project's CLAUDE.md as a welcome gesture
      openTab({
        id: 'file:CLAUDE.md',
        type: 'editor',
        label: 'CLAUDE.md',
        path: 'CLAUDE.md',
        closable: true,
      });

      // Close wizard tab and reset
      reset();
      closeTab('wizard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="wizard">
      {/* Step indicator */}
      <div className="wizard__steps">
        {STEPS.map((s, i) => (
          <span key={s.key}>
            {i > 0 && <span className="wizard__step-separator" />}
            <span
              className={`wizard__step-item ${
                s.key === step
                  ? 'wizard__step-item--active'
                  : i < currentIdx
                  ? 'wizard__step-item--completed'
                  : ''
              }`}
            >
              <span className="wizard__step-number">
                {i < currentIdx ? '\u2713' : i + 1}
              </span>
              {s.label}
            </span>
          </span>
        ))}
      </div>

      {/* Step content */}
      <div className="wizard__content">
        {step === 'name' && <StepName />}
        {step === 'api' && <StepApi />}
        {step === 'design' && <StepDesign />}
        {step === 'html-import' && <StepHtmlImport />}
        {step === 'review' && <StepReview />}
      </div>

      {/* Footer buttons */}
      <div className="wizard__footer">
        <div className="wizard__footer-left">
          {currentIdx > 0 && (
            <button
              className="wizard__btn wizard__btn--secondary"
              onClick={handleBack}
              disabled={isCreating}
            >
              Back
            </button>
          )}
        </div>
        <div className="wizard__footer-right">
          {step === 'review' ? (
            <button
              className="wizard__btn wizard__btn--primary"
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <span className="wizard__spinner" /> Creating...
                </>
              ) : (
                'Create Project'
              )}
            </button>
          ) : (
            <button
              className="wizard__btn wizard__btn--primary"
              onClick={handleNext}
              disabled={!canGoNext()}
            >
              {step === 'api' || step === 'html-import' ? 'Next (or Skip)' : 'Next'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
