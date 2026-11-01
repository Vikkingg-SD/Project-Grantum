import { FONT } from '../src/config/fonts';
import { PALETTE, RADIUS, TYPOGRAPHY } from '../src/config/theme';

declare const __dirname: string;

async function main() {
  // Node types are not a direct project dependency. Type only this CLI's Node boundary,
  // keeping runtime assertions real without changing the app's type/dependency configuration.
  const nodeModules = { assert: 'node:assert/strict', fs: 'node:fs', path: 'node:path' };
  const assert: {
    ok(condition: unknown, message?: string): asserts condition;
    equal(actual: unknown, expected: unknown, message?: string): void;
    notEqual(actual: unknown, expected: unknown, message?: string): void;
    deepEqual(actual: unknown, expected: unknown, message?: string): void;
    throws(run: () => void, diagnostic: RegExp): void;
  } = (await import(nodeModules.assert)).default;
  const { readFileSync }: { readFileSync(path: string, encoding: 'utf8'): string } = await import(
    nodeModules.fs
  );
  const { resolve }: { resolve(...paths: string[]): string } = await import(nodeModules.path);

  // Names map document semantics to implementation keys; values come only from the manifesto.
  const paletteKeys = {
    'bg-primary': 'background',
    'bg-surface': 'surface',
    'bg-subtle': 'subtle',
    'border-default': 'border',
    'border-strong': 'borderStrong',
    'text-main': 'textMain',
    'text-muted': 'textMuted',
    'brand-primary': 'primary',
    'brand-foreground': 'primaryForeground',
    'status-verified': 'verified',
    'status-pending': 'pending',
    'status-failure': 'failure',
    'status-gold': 'gold',
  } as const;
  const typographyKeys = ['display', 'h1', 'h2', 'h3', 'body', 'caption', 'metric-lg', 'metric-sm'];
  const radiusKeys = ['sm', 'md', 'lg', 'full'];
  const derivedKeys = ['surfaceMuted', 'inputBorder'];
  const modes = ['dark', 'light'] as const;
  type FontRole = keyof typeof FONT;
  type TypeRow = {
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    fontRole: FontRole;
  };
  type TokenSet = {
    palette: Record<string, Record<string, string>>;
    typography: Record<string, Partial<Omit<TypeRow, 'fontRole'>> & { fontFamily?: string }>;
    radius: Record<string, number>;
  };

  function mergeRow<T>(rows: Map<string, T>, key: string, value: T) {
    if (rows.has(key)) assert.deepEqual(value, rows.get(key), `conflicting row ${key}`);
    rows.set(key, value);
  }

  function measure(cell: string, unit: 'px' | 'em', label: string): number {
    const match = cell.match(new RegExp(`^([+-]?\\d+(?:\\.\\d+)?)${unit}$`));
    assert.ok(match, `malformed ${label}`);
    const value = Number(match[1]);
    assert.ok(Number.isFinite(value) && (unit === 'em' || value > 0), `invalid ${label}`);
    return value;
  }

  function color(cell: string, label: string): string {
    const match = cell.match(/^(#[\da-f]{6})(?:\s+\([^()]+\))?$/i);
    assert.ok(match, `malformed ${label}`);
    return match[1].toUpperCase();
  }

  function parseManifesto(document: string) {
    const palette = new Map<string, string[]>();
    const typography = new Map<string, TypeRow>();
    const radii = new Map<string, number>();
    const families = new Map<string, string>();
    const incomplete: TypeRow[] = [];

    for (const [role, label] of [
      ['sans', 'Human/Structural'],
      ['mono', 'Deterministic/Metric'],
    ] as const) {
      const declarations = document.matchAll(new RegExp(`${label} Role \\(([^()]+)\\):`, 'g'));
      for (const declaration of declarations) mergeRow(families, role, declaration[1]);
      assert.ok(families.has(role), `missing font declaration ${role}`);
    }

    for (const line of document.split(/\r?\n/)) {
      if (line.trimStart().startsWith('│')) {
        const complete = line.trimEnd().endsWith('│');
        const cells = line
          .trim()
          .split('│')
          .slice(1, complete ? -1 : undefined);
        const [key, ...values] = cells.map((cell) => cell.trim());
        if (Object.hasOwn(paletteKeys, key)) {
          assert.ok(complete && values.length === 2, `incomplete palette ${key}`);
          mergeRow(
            palette,
            key,
            values.map((cell) => color(cell, `palette ${key}`))
          );
        } else if (key.startsWith('text-') && typographyKeys.includes(key.slice(5))) {
          assert.equal(values.length, 4, `malformed typography ${key}`);
          const size = values[0].match(/^(\S+?)(?: \(([^()]+)\))?$/);
          assert.ok(size, `malformed font size ${key}`);
          assert.ok(!size[2] || size[2] === 'Mono', `malformed font role ${key}`);
          const fontSize = measure(size[1], 'px', `size ${key}`);
          const row: TypeRow = {
            fontSize,
            lineHeight: measure(values[1], 'px', `line height ${key}`),
            letterSpacing: Number(
              (measure(values[2], 'em', `letter spacing ${key}`) * fontSize).toFixed(12)
            ),
            fontRole: size[2] === 'Mono' ? 'mono' : 'sans',
          };
          if (!complete) {
            // The sole known truncated row must agree with a later complete metric-lg row.
            assert.ok(key === 'text-metric-lg' && incomplete.length === 0, `incomplete ${key}`);
            assert.ok(
              !typography.has('metric-lg'),
              'incomplete metric-lg must precede complete row'
            );
            incomplete.push(row);
          } else {
            mergeRow(typography, key.slice(5), row);
          }
        }
      }
      const radius = line.match(/^- `radius-([^`]+)`: (.+?) \([^()]+\)\.$/);
      if (radius && radiusKeys.includes(radius[1])) {
        mergeRow(radii, radius[1], measure(radius[2], 'px', `radius ${radius[1]}`));
      }
    }

    for (const key of Object.keys(paletteKeys))
      assert.ok(palette.has(key), `missing palette ${key}`);
    for (const key of typographyKeys) assert.ok(typography.has(key), `missing typography ${key}`);
    for (const row of incomplete) {
      assert.deepEqual(row, typography.get('metric-lg'), 'incomplete metric-lg disagrees');
    }
    for (const key of radiusKeys) assert.ok(radii.has(key), `missing radius ${key}`);

    for (const key of derivedKeys) {
      const entries = document.matchAll(new RegExp('`' + key + '` — ([^—]+?)\\)', 'g'));
      for (const entry of entries) {
        const pair = entry[1].match(/\((\S+) Obsidian \/ (\S+) Quartz$/);
        assert.ok(pair, `malformed derived ${key}`);
        mergeRow(palette, key, [color(pair[1], key), color(pair[2], key)]);
      }
      assert.ok(palette.has(key), `missing derived ${key}`);
    }
    return { palette, typography, radius: radii, families };
  }

  function verify(document: string, tokens: TokenSet) {
    const expected = parseManifesto(document);
    for (const [semantic, pair] of expected.palette) {
      const key = Object.hasOwn(paletteKeys, semantic)
        ? paletteKeys[semantic as keyof typeof paletteKeys]
        : semantic;
      modes.forEach((mode, index) => {
        assert.equal(
          tokens.palette[mode]?.[key]?.toUpperCase(),
          pair[index],
          `palette ${mode}.${key}`
        );
      });
    }
    for (const [key, row] of expected.typography) {
      const actual = tokens.typography[key];
      assert.ok(actual, `missing implementation typography ${key}`);
      for (const field of ['fontSize', 'lineHeight', 'letterSpacing'] as const) {
        assert.equal(actual[field], row[field], `typography ${key}.${field}`);
      }
      const family = expected.families.get(row.fontRole)!.replace(/\s/g, '');
      const fonts: readonly string[] = Object.values(FONT[row.fontRole]);
      assert.ok(
        actual.fontFamily?.startsWith(`${family}_`) && fonts.includes(actual.fontFamily),
        `typography ${key}.fontRole`
      );
    }
    for (const [key, value] of expected.radius) {
      assert.equal(tokens.radius[key], value, `radius ${key}`);
    }
  }

  const document = readFileSync(resolve(__dirname, '../DESIGN_MANIFESTO.md'), 'utf8');
  const tokens: TokenSet = {
    palette: { dark: { ...PALETTE.dark }, light: { ...PALETTE.light } },
    typography: TYPOGRAPHY,
    radius: RADIUS,
  };
  const cases: [string, () => void][] = [];
  const test = (name: string, run: () => void) => cases.push([name, run]);
  const rejectToken = (name: string, mutate: (copy: TokenSet) => void, diagnostic: RegExp) => {
    test(name, () => {
      const copy = structuredClone(tokens);
      mutate(copy);
      assert.throws(() => verify(document, copy), diagnostic);
    });
  };
  const rejectDocument = (name: string, mutate: (copy: string) => string, diagnostic: RegExp) => {
    test(name, () => {
      const copy = mutate(document);
      assert.notEqual(copy, document, 'fixture must actually mutate the document');
      assert.throws(() => verify(copy, tokens), diagnostic);
    });
  };
  const tableRow = (key: string) =>
    document.split(/\r?\n/).find((line) => line.startsWith(`│ ${key} │`) && line.endsWith('│'))!;

  test('document parity: 30 colors, eight typography roles, four radii', () =>
    verify(document, tokens));
  test('matching complete duplicates remain valid', () => {
    verify(`${document}\n${tableRow('text-metric-lg')}\n${tableRow('bg-primary')}`, tokens);
  });
  test('document values drive expectations without a second numeric registry', () => {
    const copy = structuredClone(tokens);
    copy.typography.display.fontSize! += 1;
    copy.typography.display.letterSpacing = Number(
      (
        (copy.typography.display.letterSpacing! / TYPOGRAPHY.display.fontSize) *
        copy.typography.display.fontSize!
      ).toFixed(12)
    );
    const row = tableRow('text-display');
    const changed = document.replaceAll(
      row,
      row.replace(`${TYPOGRAPHY.display.fontSize}px`, `${copy.typography.display.fontSize}px`)
    );
    assert.notEqual(changed, document);
    verify(changed, copy);
  });
  for (const mode of modes) {
    rejectToken(
      `reject ${mode} core color drift`,
      (copy) => {
        copy.palette[mode].background = copy.palette[mode].surface;
      },
      new RegExp(`palette ${mode}.background`)
    );
    for (const key of derivedKeys) {
      rejectToken(
        `reject ${mode} derived ${key} drift`,
        (copy) => {
          copy.palette[mode][key] = copy.palette[mode].background;
        },
        new RegExp(`palette ${mode}.${key}`)
      );
    }
  }
  for (const [field, diagnostic] of [
    ['fontSize', /typography h3.fontSize/],
    ['lineHeight', /typography h3.lineHeight/],
    ['letterSpacing', /typography h3.letterSpacing/],
  ] as const) {
    rejectToken(
      `reject implementation ${field} drift`,
      (copy) => {
        copy.typography.h3[field]! += 1;
      },
      diagnostic
    );
  }
  rejectToken(
    'reject radius drift',
    (copy) => {
      copy.radius.lg += 1;
    },
    /radius lg/
  );
  rejectToken(
    'reject font role drift',
    (copy) => {
      copy.typography['metric-lg'].fontFamily = FONT.sans.bold;
    },
    /typography metric-lg.fontRole/
  );
  rejectToken(
    'reject missing implementation palette key',
    (copy) => {
      delete copy.palette.light.gold;
    },
    /palette light.gold/
  );
  rejectToken(
    'reject missing implementation typography key',
    (copy) => {
      delete copy.typography.caption;
    },
    /missing implementation typography caption/
  );
  rejectToken(
    'reject missing implementation radius key',
    (copy) => {
      delete copy.radius.full;
    },
    /radius full/
  );
  rejectToken(
    'reject missing implementation measure',
    (copy) => {
      delete copy.typography.h2.letterSpacing;
    },
    /typography h2.letterSpacing/
  );
  rejectDocument(
    'reject conflicting complete typography row',
    (copy) =>
      `${copy}\n${tableRow('text-display').replace(`${TYPOGRAPHY.display.fontSize}px`, '1px')}`,
    /conflicting row display/
  );
  rejectDocument(
    'reject conflicting complete palette row',
    (copy) =>
      `${copy}\n${tableRow('bg-primary').replace(PALETTE.dark.background, PALETTE.dark.surface)}`,
    /conflicting row bg-primary/
  );
  rejectDocument(
    'reject conflicting radius declaration',
    (copy) => `${copy}\n- \`radius-lg\`: 1px (Conflict).`,
    /conflicting row lg/
  );
  rejectDocument(
    'reject missing documented palette key',
    (copy) =>
      copy
        .split('\n')
        .filter((line) => !line.startsWith('│ status-gold │'))
        .join('\n'),
    /missing palette status-gold/
  );
  rejectDocument(
    'reject missing documented typography key',
    (copy) =>
      copy
        .split('\n')
        .filter((line) => !line.startsWith('│ text-caption │'))
        .join('\n'),
    /missing typography caption/
  );
  rejectDocument(
    'reject missing documented radius key',
    (copy) =>
      copy
        .split('\n')
        .filter((line) => !line.startsWith('- `radius-full`:'))
        .join('\n'),
    /missing radius full/
  );
  rejectDocument(
    'reject missing derived declaration',
    (copy) => copy.replaceAll('`surfaceMuted` —', '`unregistered` —'),
    /missing derived surfaceMuted/
  );
  rejectDocument(
    'reject malformed documented color',
    (copy) =>
      copy.replace(
        tableRow('bg-primary'),
        tableRow('bg-primary').replace(PALETTE.dark.background, 'invalid-color')
      ),
    /malformed palette bg-primary/
  );
  for (const [label, field, unit] of [
    ['size', 'fontSize', 'px'],
    ['line height', 'lineHeight', 'px'],
    ['letter spacing', 'letterSpacing', 'em'],
  ] as const) {
    rejectDocument(
      `reject malformed documented ${label}`,
      (copy) => {
        const row = tableRow('text-display');
        const cells = row.split('│');
        const index = { fontSize: 2, lineHeight: 3, letterSpacing: 4 }[field];
        cells[index] = ` 1${unit}-junk `;
        return copy.replace(row, cells.join('│'));
      },
      new RegExp(`malformed ${label} text-display`)
    );
  }
  rejectDocument(
    'reject malformed documented radius',
    (copy) => copy.replace('`radius-lg`: 16px', '`radius-lg`: 16em'),
    /malformed radius lg/
  );
  rejectDocument(
    'reject malformed font annotation',
    (copy) => copy.replace('(Mono) │', '(Unknown) │'),
    /malformed font role text-metric-lg/
  );
  rejectDocument(
    'reject conflicting font declaration',
    (copy) => copy.replace('Human/Structural Role (Inter)', 'Human/Structural Role (Unknown)'),
    /conflicting row sans/
  );
  rejectDocument(
    'reject missing font declaration',
    (copy) => copy.replaceAll('Deterministic/Metric Role', 'Unknown Role'),
    /missing font declaration mono/
  );
  rejectDocument(
    'reject incomplete metric-lg without complete counterpart',
    (copy) => copy.replace(tableRow('text-metric-lg'), ''),
    /missing typography metric-lg/
  );
  rejectDocument(
    'reject conflicting incomplete metric-lg',
    (copy) => copy.replace('│ text-metric-lg │ 28px', '│ text-metric-lg │ 1px'),
    /incomplete metric-lg disagrees/
  );
  rejectDocument(
    'reject other incomplete typography rows',
    (copy) => copy.replace(tableRow('text-display'), tableRow('text-display').slice(0, -1)),
    /incomplete text-display/
  );

  let failed = 0;
  for (const [name, run] of cases) {
    try {
      run();
      console.log(`PASS ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failed) process.exitCode = 1;
  else
    console.log(
      `ALL ${cases.length} TOKEN CASES PASS (no spacing/shadow or rendered acceptance claim)`
    );
}

main().catch((error: unknown) => {
  console.error(`FAIL token verifier: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
