export type TabType = 'welcome' | 'editor' | 'terminal' | 'preview' | 'wizard' | 'git' | 'projects' | 'console';

export interface Tab {
  id: string;
  type: TabType;
  label: string;
  path?: string;
  closable: boolean;
}
