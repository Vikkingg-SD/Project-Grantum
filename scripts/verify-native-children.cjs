const assert = require('node:assert/strict');
const ts = require('typescript');

// Detect primitive short-circuit values before they become development-only RN Web errors.
function primitiveGuards(source, checker) {
  const issues = [];
  function inspect(node) {
    if (
      ts.isJsxElement(node) &&
      /^(View|ScrollView|Pressable|TouchableOpacity|SafeAreaView)$/.test(
        node.openingElement.tagName.getText(source)
      )
    ) {
      for (const child of node.children) {
        if (!ts.isJsxExpression(child) || !child.expression) continue;
        function guard(expression) {
          if (
            !ts.isBinaryExpression(expression) ||
            expression.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken
          )
            return;
          const type = checker.getTypeAtLocation(expression.left);
          const types = type.isUnion() ? type.types : [type];
          const primitive =
            ts.TypeFlags.StringLike | ts.TypeFlags.NumberLike | ts.TypeFlags.BigIntLike;
          const allowed =
            primitive |
            ts.TypeFlags.BooleanLike |
            ts.TypeFlags.Undefined |
            ts.TypeFlags.Null |
            ts.TypeFlags.Never;
          if (types.some((t) => t.flags & primitive) && types.every((t) => t.flags & allowed)) {
            const location = source.getLineAndCharacterOfPosition(expression.left.getStart(source));
            issues.push(
              `${source.fileName}:${location.line + 1} primitive guard: ${expression.left.getText(source)}`
            );
          }
          guard(expression.left);
          guard(expression.right);
        }
        guard(child.expression);
      }
    }
    ts.forEachChild(node, inspect);
  }
  inspect(source);
  return issues;
}

const configFile = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
const fixtureName = '/native-child-fixture.tsx';
const fixture = ts.createSourceFile(
  fixtureName,
  `
declare const View: any;
declare const label: string | undefined;
declare const count: number;
const unsafe = <View>{label && <View />}{count && <View />}</View>;
const safe = <View>{!!label && <View />}{count > 0 && <View />}{label ? <View /> : null}</View>;
`,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX
);
const host = ts.createCompilerHost({});
host.getSourceFile = (name) => (name === fixtureName ? fixture : undefined);
const fixtureProgram = ts.createProgram(
  [fixtureName],
  { strictNullChecks: true, noLib: true },
  host
);
assert.equal(
  primitiveGuards(fixture, fixtureProgram.getTypeChecker()).length,
  2,
  'Given string and numeric guards When scanned Then unsafe children fail while boolean guards pass'
);
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, process.cwd());
const program = ts.createProgram(config.fileNames, config.options);
const checker = program.getTypeChecker();
const issues = program
  .getSourceFiles()
  .filter((source) => !source.isDeclarationFile && !source.fileName.includes('node_modules'))
  .flatMap((source) => primitiveGuards(source, checker));
assert.deepEqual(
  issues,
  [],
  'Nullable strings/numbers under native containers require boolean guards or a ternary'
);
process.stdout.write(
  'PASS Given native containers When scanning typed JSX guards Then no primitive can leak through short-circuit rendering\n'
);
