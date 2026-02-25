import { useWizardStore } from '../../store/wizardStore';

export function StepReview() {
  const projectName = useWizardStore((s) => s.projectName);
  const apiSpec = useWizardStore((s) => s.apiSpec);
  const colors = useWizardStore((s) => s.colors);
  const logoFileName = useWizardStore((s) => s.logoFileName);
  const designFiles = useWizardStore((s) => s.designFiles);
  const isCreating = useWizardStore((s) => s.isCreating);
  const error = useWizardStore((s) => s.error);

  return (
    <div>
      <h2 className="wizard__section-title">Review & Create</h2>
      <p className="wizard__section-desc">
        Review your choices below. Click "Create Project" to scaffold your new app.
      </p>

      <div className="wizard__review-section">
        <div className="wizard__review-label">Project Name</div>
        <div className="wizard__review-value">{projectName}</div>
      </div>

      <div className="wizard__review-section">
        <div className="wizard__review-label">API Specification</div>
        <div className="wizard__review-value">
          {apiSpec
            ? `${apiSpec.title} v${apiSpec.version} — ${apiSpec.endpoints.length} endpoints`
            : 'None (skipped)'}
        </div>
      </div>

      <div className="wizard__review-section">
        <div className="wizard__review-label">Colors</div>
        <div className="wizard__review-value">
          <div className="wizard__review-colors">
            <div className="wizard__review-color">
              <span className="wizard__review-swatch" style={{ background: colors.primary }} />
              Primary: {colors.primary}
            </div>
            <div className="wizard__review-color">
              <span className="wizard__review-swatch" style={{ background: colors.accent }} />
              Accent: {colors.accent}
            </div>
            <div className="wizard__review-color">
              <span className="wizard__review-swatch" style={{ background: colors.background, border: '1px solid #313244' }} />
              Background: {colors.background}
            </div>
          </div>
        </div>
      </div>

      <div className="wizard__review-section">
        <div className="wizard__review-label">Logo</div>
        <div className="wizard__review-value">
          {logoFileName || 'None (placeholder will be used)'}
        </div>
      </div>

      <div className="wizard__review-section">
        <div className="wizard__review-label">Design Files</div>
        <div className="wizard__review-value">
          {designFiles.length > 0
            ? designFiles.map(f => f.name).join(', ')
            : 'None'}
        </div>
      </div>

      {isCreating && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 16 }}>
          <span className="wizard__spinner" />
          <span style={{ fontSize: 14 }}>Creating project...</span>
        </div>
      )}

      {error && <p className="wizard__error" style={{ marginTop: 16 }}>{error}</p>}
    </div>
  );
}
