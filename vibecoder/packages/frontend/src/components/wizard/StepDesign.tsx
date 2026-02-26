import { useRef } from 'react';
import { useWizardStore } from '../../store/wizardStore';

const PRESETS = [
  { name: 'Indigo', primary: '#6366F1', accent: '#8B5CF6', background: '#F9FAFB' },
  { name: 'Ocean', primary: '#0EA5E9', accent: '#06B6D4', background: '#F0F9FF' },
  { name: 'Emerald', primary: '#10B981', accent: '#14B8A6', background: '#F0FDF4' },
  { name: 'Rose', primary: '#F43F5E', accent: '#EC4899', background: '#FFF1F2' },
  { name: 'Amber', primary: '#F59E0B', accent: '#EAB308', background: '#FFFBEB' },
  { name: 'Slate Dark', primary: '#6366F1', accent: '#8B5CF6', background: '#0F172A' },
];

export function StepDesign() {
  const colors = useWizardStore((s) => s.colors);
  const setColors = useWizardStore((s) => s.setColors);
  const setColor = useWizardStore((s) => s.setColor);
  const logoBase64 = useWizardStore((s) => s.logoBase64);
  const logoFileName = useWizardStore((s) => s.logoFileName);
  const setLogo = useWizardStore((s) => s.setLogo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip the data:image/...;base64, prefix
      const base64 = dataUrl.split(',')[1];
      setLogo(base64, file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogo(null, null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      <h2 className="wizard__section-title">Design & Branding</h2>
      <p className="wizard__section-desc">
        Choose your app's color scheme and optionally upload a logo.
        These will be used to generate your theme system.
      </p>

      {/* Presets */}
      <label className="wizard__label">Quick Presets</label>
      <div className="wizard__presets">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            className="wizard__preset"
            onClick={() => setColors({ primary: p.primary, accent: p.accent, background: p.background })}
          >
            <span className="wizard__preset-swatch">
              <span className="wizard__preset-dot" style={{ background: p.primary }} />
              <span className="wizard__preset-dot" style={{ background: p.accent }} />
              <span className="wizard__preset-dot" style={{ background: p.background, border: '1px solid var(--border-color)' }} />
            </span>
            <span className="wizard__preset-name">{p.name}</span>
          </button>
        ))}
      </div>

      {/* Color pickers */}
      <label className="wizard__label">Primary Color</label>
      <div className="wizard__color-row">
        <input
          type="color"
          className="wizard__color-input"
          value={colors.primary}
          onChange={(e) => setColor('primary', e.target.value)}
        />
        <input
          type="text"
          className="wizard__color-hex"
          value={colors.primary}
          onChange={(e) => setColor('primary', e.target.value)}
        />
      </div>

      <label className="wizard__label">Accent Color</label>
      <div className="wizard__color-row">
        <input
          type="color"
          className="wizard__color-input"
          value={colors.accent}
          onChange={(e) => setColor('accent', e.target.value)}
        />
        <input
          type="text"
          className="wizard__color-hex"
          value={colors.accent}
          onChange={(e) => setColor('accent', e.target.value)}
        />
      </div>

      <label className="wizard__label">Background Color</label>
      <div className="wizard__color-row">
        <input
          type="color"
          className="wizard__color-input"
          value={colors.background}
          onChange={(e) => setColor('background', e.target.value)}
        />
        <input
          type="text"
          className="wizard__color-hex"
          value={colors.background}
          onChange={(e) => setColor('background', e.target.value)}
        />
      </div>

      {/* Logo */}
      <label className="wizard__label" style={{ marginTop: 'var(--space-3)' }}>App Logo (optional)</label>
      <div className="wizard__logo-area">
        <div className="wizard__logo-preview">
          {logoBase64 ? (
            <img src={`data:image/png;base64,${logoBase64}`} alt="Logo preview" />
          ) : (
            <span className="wizard__logo-placeholder">?</span>
          )}
        </div>
        <div>
          <label className="wizard__upload-btn">
            {logoFileName || 'Choose image'}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml"
              style={{ display: 'none' }}
              onChange={handleLogoUpload}
            />
          </label>
          {logoBase64 && (
            <button
              className="wizard__btn wizard__btn--secondary"
              style={{ marginLeft: 'var(--space-2)' }}
              onClick={handleRemoveLogo}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
