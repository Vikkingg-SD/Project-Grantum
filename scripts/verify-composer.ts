import { MAX_INPUT_CHARS } from '../src/config/constants';
import { canSendMessage, composerKeyAction } from '../src/utils/composer';

const atLimit = 'a'.repeat(MAX_INPUT_CHARS);
const overLimit = 'a'.repeat(MAX_INPUT_CHARS + 1);

const cases: [string, string | boolean, string | boolean][] = [
  ['plain Enter sends text', composerKeyAction({ key: 'Enter' }, 'hello'), 'send'],
  [
    'Shift+Enter preserves newline',
    composerKeyAction({ key: 'Enter', shiftKey: true }, 'hello'),
    'none',
  ],
  [
    'composing Enter is not submitted',
    composerKeyAction({ key: 'Enter', isComposing: true }, 'hello'),
    'none',
  ],
  [
    'legacy IME keyCode 229 is not submitted',
    composerKeyAction({ key: 'Enter', keyCode: 229 }, 'hello'),
    'none',
  ],
  ['Process key is not submitted', composerKeyAction({ key: 'Process' }, 'hello'), 'none'],
  ['Backspace is not submitted', composerKeyAction({ key: 'Backspace' }, 'hello'), 'none'],
  ['whitespace Enter is prevented', composerKeyAction({ key: 'Enter' }, ' \n\t '), 'prevent'],
  ['empty Enter is prevented', composerKeyAction({ key: 'Enter' }, ''), 'prevent'],
  ['disabled Enter is prevented', composerKeyAction({ key: 'Enter' }, 'hello', true), 'prevent'],
  [
    'disabled composition stays with IME',
    composerKeyAction({ key: 'Enter', isComposing: true }, 'hello', true),
    'none',
  ],
  [
    'disabled Shift+Enter is not submitted',
    composerKeyAction({ key: 'Enter', shiftKey: true }, 'hello', true),
    'none',
  ],
  ['Enter accepts exactly 10000 characters', composerKeyAction({ key: 'Enter' }, atLimit), 'send'],
  ['Enter rejects 10001 characters', composerKeyAction({ key: 'Enter' }, overLimit), 'prevent'],
  ['trimmed text is sendable', canSendMessage(' hello '), true],
  ['whitespace is not sendable', canSendMessage(' \n\t '), false],
  ['disabled text is not sendable', canSendMessage('hello', true), false],
  ['empty input is not sendable', canSendMessage(''), false],
  ['10000 characters are sendable', canSendMessage(atLimit), true],
  ['10001 characters are not sendable', canSendMessage(overLimit), false],
  ['multiline text is sendable', canSendMessage('first\nsecond'), true],
];

let failed = 0;
for (const [name, got, want] of cases) {
  const passed = got === want;
  if (!passed) failed += 1;
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name} got=${got} want=${want}`);
}
if (failed > 0) process.exit(1);
console.log(`ALL ${cases.length} COMPOSER CASES PASS`);
