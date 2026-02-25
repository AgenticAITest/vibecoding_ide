import { useRef } from 'react';
import { useWizardStore } from '../../store/wizardStore';

export function StepHtmlImport() {
  const designFiles = useWizardStore((s) => s.designFiles);
  const addDesignFile = useWizardStore((s) => s.addDesignFile);
  const removeDesignFile = useWizardStore((s) => s.removeDesignFile);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.name.match(/\.(html|htm|css)$/i)) continue;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        addDesignFile({ name: file.name, contentBase64: base64 });
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div>
      <h2 className="wizard__section-title">HTML/CSS Design Files</h2>
      <p className="wizard__section-desc">
        Optionally upload HTML or CSS files that represent your desired design. These will
        be saved as references for the AI when building your screens. You can skip this step.
      </p>

      <div
        className="wizard__dropzone"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <p className="wizard__dropzone-text">
          Drop HTML/CSS files here or click to browse
        </p>
        <p className="wizard__dropzone-hint">
          Accepts .html, .htm, .css files
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".html,.htm,.css"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {designFiles.length > 0 && (
        <ul className="wizard__file-list">
          {designFiles.map((f) => (
            <li key={f.name} className="wizard__file-item">
              <span className="wizard__file-name">{f.name}</span>
              <button
                className="wizard__file-remove"
                onClick={() => removeDesignFile(f.name)}
                title="Remove file"
              >
                x
              </button>
            </li>
          ))}
        </ul>
      )}

      {designFiles.length === 0 && (
        <p className="wizard__hint">
          No design files added. This is optional — you can always add them later.
        </p>
      )}
    </div>
  );
}
