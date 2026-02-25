// --- API Parser types ---

export interface ApiEndpoint {
  method: string;
  path: string;
  operationId: string;
  summary: string;
  tag: string;
  parameters: { name: string; in: string; required: boolean; type: string }[];
  requestBody: string | null;
  responseType: string | null;
}

export interface ParsedApi {
  title: string;
  version: string;
  baseUrl: string;
  authType: string;
  endpoints: ApiEndpoint[];
  schemaNames: string[];
}

// --- Scaffold types ---

export interface DesignFile {
  name: string;
  contentBase64: string;
}

export interface ScaffoldConfig {
  projectName: string;
  apiSpec: ParsedApi | null;
  apiSpecRaw: string | null;
  logoBase64: string | null;
  colors: {
    primary: string;
    accent: string;
    background: string;
  };
  designFiles: DesignFile[];
}

// --- Project types ---

export interface ProjectInfo {
  name: string;
  path: string;
  createdAt: string;
}

// --- Wizard types ---

export type WizardStep = 'name' | 'api' | 'design' | 'html-import' | 'review';
