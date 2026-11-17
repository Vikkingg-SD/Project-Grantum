const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToString } = require('react-dom/server');
const native = require('react-native-web/dist/cjs');

// Render the real component and RN Web View in development. Only layout/theme
// dependencies are fixed so the optional-string states are deterministic.
const source = fs.readFileSync(
  path.join(__dirname, '../src/components/atoms/AppInput.tsx'),
  'utf8'
);
const compiled = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
const target = { exports: {} };
new Function('require', 'module', 'exports', compiled)(
  (name) => {
    if (name === 'react-native') return native;
    if (name === './AppText') return { AppText: native.Text };
    if (name === '@/store/useThemeStore')
      return { useThemeStore: (selector) => selector({ mode: 'dark' }) };
    if (name === '@/hooks/useLayoutMetrics')
      return { useLayoutMetrics: () => ({ desktop: false }) };
    if (name === '@/config/theme')
      return {
        PALETTE: {
          dark: {
            surface: '#000',
            inputBorder: '#777',
            failureText: '#f00',
            textMain: '#fff',
            textMuted: '#aaa',
          },
        },
        RADIUS: { sm: 8 },
        TYPOGRAPHY: { body: {} },
        DESKTOP_TYPOGRAPHY: { body: {} },
      };
    return require(name);
  },
  target,
  target.exports
);
const diagnostics = [];
const original = console.error;
try {
  console.error = (...args) => diagnostics.push(args.map(String).join(' '));
  for (const [label, error] of [
    [undefined, undefined],
    ['', ''],
    ['Source title', ''],
    ['Source title', 'Enter a title.'],
    ['Source title', undefined],
  ]) {
    const html = renderToString(
      React.createElement(target.exports.AppInput, {
        label,
        error,
        value: '',
        onChangeText: () => {},
      })
    );
    assert.ok(html.includes('input'));
    if (error) assert.ok(html.includes(error), 'Validation error must remain visible');
  }
} finally {
  console.error = original;
}
assert.deepEqual(
  diagnostics,
  [],
  'Given optional strings, when empty or cleared, then RN Web inputs render without errors'
);
process.stdout.write(
  'PASS Given optional strings, when empty or cleared, then RN Web inputs render without errors\n'
);
