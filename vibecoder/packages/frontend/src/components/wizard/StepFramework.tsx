import { useWizardStore } from '../../store/wizardStore';
import type { ProjectFramework } from '@vibecoder/shared';

interface FrameworkOption {
  id: ProjectFramework;
  icon: string;
  name: string;
  subtitle: string;
  accent: string;
  features: string[];
  comingSoon?: boolean;
}

const FRAMEWORKS: FrameworkOption[] = [
  {
    id: 'expo',
    icon: '\u269b\ufe0f',
    name: 'Expo (React Native)',
    subtitle: 'JavaScript / TypeScript',
    accent: '#61dafb',
    features: [
      'React Native components',
      'Expo Router navigation',
      'NPM ecosystem',
      'Live preview in browser',
    ],
  },
  {
    id: 'flutter',
    icon: '\ud83d\udc26',
    name: 'Flutter',
    subtitle: 'Dart',
    accent: '#02569b',
    features: [
      'Material & Cupertino widgets',
      'Dart language',
      'Hot reload',
      'Single codebase for iOS & Android',
    ],
  },
];

export function StepFramework() {
  const framework = useWizardStore((s) => s.framework);
  const setFramework = useWizardStore((s) => s.setFramework);

  return (
    <div>
      <h2 className="wizard__section-title">Choose a framework</h2>
      <p className="wizard__section-desc">
        Select the framework for your mobile app. This determines the language,
        component library, and tooling used to build your project.
      </p>

      <div className="wizard__fw-cards">
        {FRAMEWORKS.map((fw) => (
          <button
            key={fw.id}
            type="button"
            className={`wizard__fw-card ${framework === fw.id ? 'wizard__fw-card--selected' : ''}`}
            style={{ '--fw-accent': fw.accent } as React.CSSProperties}
            onClick={() => setFramework(fw.id)}
          >
            {fw.comingSoon && (
              <span className="wizard__fw-card-badge">Coming soon</span>
            )}
            <div className="wizard__fw-card-header">
              <span className="wizard__fw-card-icon">{fw.icon}</span>
              <div>
                <div className="wizard__fw-card-name">{fw.name}</div>
                <div className="wizard__fw-card-subtitle">{fw.subtitle}</div>
              </div>
            </div>
            <ul className="wizard__fw-card-features">
              {fw.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}
