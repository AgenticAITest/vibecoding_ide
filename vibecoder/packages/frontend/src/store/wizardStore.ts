import { create } from 'zustand';
import type { WizardStep, ParsedApi, DesignFile, ProjectFramework } from '@vibecoder/shared';

interface WizardState {
  step: WizardStep;
  framework: ProjectFramework;
  projectName: string;
  apiSpec: ParsedApi | null;
  apiSpecRaw: string | null;
  logoBase64: string | null;
  logoFileName: string | null;
  colors: {
    primary: string;
    accent: string;
    background: string;
  };
  designFiles: DesignFile[];
  isCreating: boolean;
  error: string | null;
}

interface WizardActions {
  setStep: (step: WizardStep) => void;
  setFramework: (framework: ProjectFramework) => void;
  setProjectName: (name: string) => void;
  setApiSpec: (spec: ParsedApi | null, raw: string | null) => void;
  setLogo: (base64: string | null, fileName: string | null) => void;
  setColors: (colors: { primary: string; accent: string; background: string }) => void;
  setColor: (key: 'primary' | 'accent' | 'background', value: string) => void;
  addDesignFile: (file: DesignFile) => void;
  removeDesignFile: (name: string) => void;
  setIsCreating: (creating: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const INITIAL_STATE: WizardState = {
  step: 'name',
  framework: 'expo',
  projectName: '',
  apiSpec: null,
  apiSpecRaw: null,
  logoBase64: null,
  logoFileName: null,
  colors: {
    primary: '#6366F1',
    accent: '#8B5CF6',
    background: '#F9FAFB',
  },
  designFiles: [],
  isCreating: false,
  error: null,
};

export const useWizardStore = create<WizardState & WizardActions>((set) => ({
  ...INITIAL_STATE,

  setStep: (step) => set({ step, error: null }),
  setFramework: (framework) => set({ framework }),
  setProjectName: (projectName) => set({ projectName }),
  setApiSpec: (apiSpec, apiSpecRaw) => set({ apiSpec, apiSpecRaw }),
  setLogo: (logoBase64, logoFileName) => set({ logoBase64, logoFileName }),
  setColors: (colors) => set({ colors }),
  setColor: (key, value) => set((s) => ({ colors: { ...s.colors, [key]: value } })),
  addDesignFile: (file) => set((s) => ({
    designFiles: [...s.designFiles.filter(f => f.name !== file.name), file],
  })),
  removeDesignFile: (name) => set((s) => ({
    designFiles: s.designFiles.filter(f => f.name !== name),
  })),
  setIsCreating: (isCreating) => set({ isCreating }),
  setError: (error) => set({ error }),
  reset: () => set(INITIAL_STATE),
}));
