export type ChatVariant = 'user' | 'assistant-narrative' | 'assistant-auditor' | 'system';

export interface ChatEntry {
  id: string;
  text: string;
  variant: ChatVariant;
  timestamp?: string;
}
