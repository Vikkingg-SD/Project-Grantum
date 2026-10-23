import { partializeTheme, type ThemeState } from '../src/store/themePersist';

let failed = 0;

const assert = (name: string, condition: boolean) => {
  if (condition) {
    console.log(`PASS ${name}`);
  } else {
    console.log(`FAIL ${name}`);
    failed += 1;
  }
};

const noop = () => {};

// 1. No explicit choice -> mode is NOT persisted
const stateNoChoice: ThemeState = {
  mode: 'dark',
  hasExplicitChoice: false,
  toggleTheme: noop,
  setTheme: noop,
};
const persistedNoChoice = partializeTheme(stateNoChoice);
assert('mode not persisted when no explicit choice', persistedNoChoice.mode === undefined);
assert('hasExplicitChoice persisted as false', persistedNoChoice.hasExplicitChoice === false);

// 2. Explicit choice -> mode IS persisted
const stateWithChoice: ThemeState = {
  mode: 'light',
  hasExplicitChoice: true,
  toggleTheme: noop,
  setTheme: noop,
};
const persistedWithChoice = partializeTheme(stateWithChoice);
assert('mode persisted when explicit choice', persistedWithChoice.mode === 'light');
assert('hasExplicitChoice persisted as true', persistedWithChoice.hasExplicitChoice === true);

// 3. Listener logic (simulated)
// Widened to `string` to prevent TS2367 (TS control-flow doesn't track closure mutations)
let storeMode: string = 'dark';
let storeHasChoice = false;

const listener = ({ colorScheme }: { colorScheme: 'light' | 'dark' | null }) => {
  if (!storeHasChoice && colorScheme) {
    storeMode = colorScheme;
  }
};

// System changes to light, no choice -> follows
listener({ colorScheme: 'light' });
assert('follows system when no choice', storeMode === 'light');

// User makes explicit choice
storeHasChoice = true;
storeMode = 'dark';

// System changes to light, has choice -> ignores
listener({ colorScheme: 'light' });
assert('ignores system when explicit choice', storeMode === 'dark');

if (failed > 0) {
  console.log(`\n${failed} THEME CASES FAILED`);
  process.exit(1);
}

console.log('\nALL THEME CASES PASS');
