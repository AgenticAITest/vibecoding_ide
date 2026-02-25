import { useState } from 'react';
import { useWizardStore } from '../../store/wizardStore';
import { projectApi } from '../../lib/api';
import type { ParsedApi } from '@vibecoder/shared';

type ApiTab = 'paste' | 'url' | 'file';

export function StepApi() {
  const apiSpec = useWizardStore((s) => s.apiSpec);
  const setApiSpec = useWizardStore((s) => s.setApiSpec);
  const [tab, setTab] = useState<ApiTab>('paste');
  const [jsonText, setJsonText] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleParseJson = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { parsed } = await projectApi.parseApi(text);
      setApiSpec(parsed, text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse API spec');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { parsed, raw } = await projectApi.fetchApiUrl(url.trim());
      setApiSpec(parsed, raw);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch API spec');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setJsonText(text);
      handleParseJson(text);
    };
    reader.readAsText(file);
  };

  const handleClear = () => {
    setApiSpec(null, null);
    setJsonText('');
    setUrl('');
    setError(null);
  };

  return (
    <div>
      <h2 className="wizard__section-title">API Specification</h2>
      <p className="wizard__section-desc">
        Optionally provide an OpenAPI/Swagger JSON spec. VibeCoder will generate typed
        API functions and auth scaffolding. You can skip this step.
      </p>

      {apiSpec ? (
        <ApiSummary spec={apiSpec} onClear={handleClear} />
      ) : (
        <>
          <div className="wizard__tabs">
            <button
              className={`wizard__tab ${tab === 'paste' ? 'wizard__tab--active' : ''}`}
              onClick={() => setTab('paste')}
            >
              Paste JSON
            </button>
            <button
              className={`wizard__tab ${tab === 'url' ? 'wizard__tab--active' : ''}`}
              onClick={() => setTab('url')}
            >
              Fetch URL
            </button>
            <button
              className={`wizard__tab ${tab === 'file' ? 'wizard__tab--active' : ''}`}
              onClick={() => setTab('file')}
            >
              Upload File
            </button>
          </div>

          {tab === 'paste' && (
            <div>
              <textarea
                className="wizard__textarea"
                placeholder='Paste your OpenAPI 3.x or Swagger 2.0 JSON here...'
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={8}
              />
              <button
                className="wizard__btn wizard__btn--primary"
                style={{ marginTop: 12 }}
                onClick={() => handleParseJson(jsonText)}
                disabled={loading || !jsonText.trim()}
              >
                {loading ? <span className="wizard__spinner" /> : 'Parse'}
              </button>
            </div>
          )}

          {tab === 'url' && (
            <div>
              <label className="wizard__label">Spec URL</label>
              <input
                className="wizard__input"
                type="url"
                placeholder="https://api.example.com/openapi.json"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button
                className="wizard__btn wizard__btn--primary"
                style={{ marginTop: 12 }}
                onClick={handleFetchUrl}
                disabled={loading || !url.trim()}
              >
                {loading ? <span className="wizard__spinner" /> : 'Fetch & Parse'}
              </button>
            </div>
          )}

          {tab === 'file' && (
            <div>
              <label className="wizard__upload-btn">
                Choose JSON file
                <input
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          )}

          {error && <p className="wizard__error">{error}</p>}
        </>
      )}
    </div>
  );
}

function ApiSummary({ spec, onClear }: { spec: ParsedApi; onClear: () => void }) {
  return (
    <div className="wizard__api-summary">
      <h4>{spec.title} v{spec.version}</h4>
      <p>Base URL: {spec.baseUrl || '(not specified)'}</p>
      <p>Auth: {spec.authType}</p>
      <p>Endpoints: {spec.endpoints.length}</p>
      <p>Schemas: {spec.schemaNames.length}</p>
      <button
        className="wizard__btn wizard__btn--secondary"
        style={{ marginTop: 12 }}
        onClick={onClear}
      >
        Clear & re-import
      </button>
    </div>
  );
}
