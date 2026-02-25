import { useState } from 'react';
import { useWizardStore } from '../../store/wizardStore';
import { projectApi } from '../../lib/api';

export function StepName() {
  const projectName = useWizardStore((s) => s.projectName);
  const setProjectName = useWizardStore((s) => s.setProjectName);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProjectName(e.target.value);
    setValidationError(null);
  };

  const handleBlur = async () => {
    if (!projectName.trim()) return;
    setValidating(true);
    try {
      const result = await projectApi.validateName(projectName.trim());
      if (!result.valid) {
        setValidationError(result.error || 'Invalid name');
      }
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div>
      <h2 className="wizard__section-title">Name your project</h2>
      <p className="wizard__section-desc">
        Choose a name for your new Expo (React Native) project. This will be used as
        the folder name and the app display name.
      </p>

      <label className="wizard__label">Project Name</label>
      <input
        className={`wizard__input ${validationError ? 'wizard__input--error' : ''}`}
        type="text"
        value={projectName}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="my-awesome-app"
        autoFocus
        maxLength={50}
      />

      {validating && (
        <p className="wizard__hint">Checking name...</p>
      )}
      {validationError && (
        <p className="wizard__error">{validationError}</p>
      )}
      {!validationError && !validating && projectName.length >= 3 && (
        <p className="wizard__hint">Looks good!</p>
      )}
    </div>
  );
}
