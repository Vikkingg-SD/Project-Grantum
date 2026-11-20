import { MAX_INPUT_CHARS } from '@/config/constants';

export interface ComposerKeyInput {
  key: string;
  shiftKey?: boolean;
  isComposing?: boolean;
  keyCode?: number;
}

export type ComposerKeyAction = 'none' | 'prevent' | 'send';

export function canSendMessage(value: string, disabled = false, attachmentCount = 0): boolean {
  return (
    !disabled && value.length <= MAX_INPUT_CHARS && (value.trim().length > 0 || attachmentCount > 0)
  );
}

export function composerKeyAction(
  event: ComposerKeyInput,
  value: string,
  disabled = false,
  attachmentCount = 0
): ComposerKeyAction {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing || event.keyCode === 229) {
    return 'none';
  }
  return canSendMessage(value, disabled, attachmentCount) ? 'send' : 'prevent';
}
