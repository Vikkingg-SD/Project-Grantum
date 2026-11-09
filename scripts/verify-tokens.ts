import { PALETTE, TYPOGRAPHY, DESKTOP_TYPOGRAPHY } from '../src/config/theme';
const assert = {
  ok(condition: unknown, message = 'Assertion failed') {
    if (!condition) throw new Error(message);
  },
  equal(actual: unknown, expected: unknown) {
    if (actual !== expected)
      throw new Error(`Expected ${String(expected)}, received ${String(actual)}`);
  },
  match(actual: string, expected: RegExp) {
    if (!expected.test(actual)) throw new Error(`Expected ${actual} to match ${expected}`);
  },
};
function luminance(hex: string) {
  const rgb = hex
    .slice(1)
    .match(/../g)!
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
for (const [mode, colors] of Object.entries(PALETTE)) {
  for (const surface of ['background', 'surface', 'subtle'] as const) {
    for (const text of [
      'textMain',
      'textMuted',
      'primaryText',
      'verifiedText',
      'pendingText',
      'failureText',
      'goldText',
    ] as const) {
      const values = [luminance(colors[surface]), luminance(colors[text])].sort((a, b) => a - b);
      assert.ok(
        (values[1] + 0.05) / (values[0] + 0.05) >= 4.5,
        `${mode} ${text} on ${surface} needs 4.5:1 contrast`
      );
    }
  }
  for (const [background, foreground] of [
    [colors.primary, colors.primaryForeground],
    [colors.failure, colors.failureForeground],
  ]) {
    const values = [luminance(background), luminance(foreground)].sort((a, b) => a - b);
    assert.ok((values[1] + 0.05) / (values[0] + 0.05) >= 4.5, `${mode} button contrast`);
  }
}
assert.ok(TYPOGRAPHY.body.fontSize >= 16, 'Body copy needs a readable phone size');
assert.ok(TYPOGRAPHY.caption.fontSize >= 14, 'Operational metadata needs a readable floor');
assert.ok(DESKTOP_TYPOGRAPHY.body!.fontSize! >= 18, 'Desktop body copy must remain readable');
for (const [role, value] of Object.entries(TYPOGRAPHY))
  assert.ok(value.lineHeight > value.fontSize, `${role} line height`);
console.info(
  'PASS Given both themes When text uses operational surfaces Then contrast and type floors hold'
);
