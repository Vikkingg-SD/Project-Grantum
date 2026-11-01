import path from 'node:path';
import ts from 'typescript';

const normalize = (file) => path.posix.normalize(file.replaceAll('\\', '/')).replace(/^\//, '');
const sourceExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];

export function resolveProjectModule(sources, from, specifier) {
  let base;
  if (specifier.startsWith('@/')) base = `src/${specifier.slice(2)}`;
  else if (specifier.startsWith('.')) {
    base = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
  } else return null;
  const candidates = [
    base,
    ...sourceExtensions.map((extension) => base + extension),
    ...sourceExtensions.map((extension) => `${base}/index${extension}`),
  ];
  // TypeScript permits emitted .js specifiers to resolve to their original .ts source.
  if (/\.[cm]?jsx?$/.test(base)) {
    const stem = base.replace(/\.[cm]?jsx?$/, '');
    candidates.push(`${stem}.ts`, `${stem}.tsx`);
  }
  return candidates.find((candidate) => sources.has(candidate)) ?? { missing: base };
}

/** Analyze only supplied source strings; never consult the filesystem or resolve packages. */
export function analyzeModules(sourceMap, resolver) {
  const modules = new Map();
  const graph = new Map();
  const imports = [];
  const diagnostics = [];
  const add = (code, file, msg) => diagnostics.push({ level: 'FAIL', code, file, msg });
  try {
    const sources = new Map();
    for (const [file, text] of [...sourceMap].sort(([a], [b]) => a.localeCompare(b))) {
      const key = normalize(file);
      if (sources.has(key) || typeof text !== 'string') {
        throw new Error('Duplicate source path or non-string module body');
      }
      sources.set(key, text);
    }
    const resolve =
      resolver ?? ((from, specifier) => resolveProjectModule(sources, from, specifier));
    const resolutions = new Map();
    const resolveCached = (from, specifier) => {
      const key = JSON.stringify([from, specifier]);
      if (!resolutions.has(key)) {
        const result = resolve(from, specifier);
        if (
          result !== null &&
          typeof result !== 'string' &&
          !(result && typeof result.missing === 'string')
        ) {
          throw new Error('Resolver returned an invalid result');
        }
        resolutions.set(key, typeof result === 'string' ? normalize(result) : result);
      }
      return resolutions.get(key);
    };
    const ast = new Map();
    for (const [file, text] of sources) {
      ast.set(file, ts.createSourceFile(`/${file}`, text, ts.ScriptTarget.Latest, true));
      graph.set(file, new Set());
    }
    const options = {
      noLib: true,
      noEmit: true,
      allowJs: true,
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.Preserve,
    };
    const host = {
      getSourceFile: (file) => ast.get(normalize(file)),
      getDefaultLibFileName: () => '',
      writeFile: () => {},
      getCurrentDirectory: () => '/',
      getDirectories: () => [],
      fileExists: (file) => sources.has(normalize(file)),
      readFile: (file) => sources.get(normalize(file)),
      getCanonicalFileName: (file) => file,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      resolveModuleNames: (specifiers, containingFile) =>
        specifiers.map((specifier) => {
          const result = resolveCached(normalize(containingFile), specifier);
          return typeof result === 'string' ? { resolvedFileName: `/${result}` } : undefined;
        }),
    };
    const program = ts.createProgram(
      [...ast.keys()].map((file) => `/${file}`),
      options,
      host
    );
    const checker = program.getTypeChecker();
    const analysisErrors = [
      ...program.getSyntacticDiagnostics(),
      ...program.getSemanticDiagnostics().filter((diagnostic) => diagnostic.code === 2308),
    ];
    for (const diagnostic of analysisErrors) {
      const file = diagnostic.file ? normalize(diagnostic.file.fileName) : '';
      add(
        'MODULE-ANALYSIS',
        file,
        `${file}: TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`
      );
    }
    for (const [file, source] of ast) {
      const symbol = checker.getSymbolAtLocation(source);
      const exported = symbol ? checker.getExportsOfModule(symbol) : [];
      const names = new Set();
      const typeNames = new Set();
      const identities = new Map();
      for (const entry of exported) {
        const name = entry.getName();
        const target = entry.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(entry) : entry;
        const declarations = target.declarations ?? [];
        identities.set(
          name,
          declarations
            .map(
              (declaration) =>
                `${normalize(declaration.getSourceFile().fileName)}:${declaration.pos}`
            )
            .sort()
            .join('|') || target.getName()
        );
        if (name !== 'default') names.add(name);
        if (target.flags & ts.SymbolFlags.Type) typeNames.add(name);
      }
      modules.set(file, { names, typeNames, identities, hasDefault: identities.has('default') });
      for (const statement of source.statements) {
        if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
        if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
        const specifier = statement.moduleSpecifier.text;
        const target = resolveCached(file, specifier);
        if (target === null) continue;
        if (typeof target !== 'string' || !sources.has(target)) {
          add('MISSING-FILE', file, `${file} references "${specifier}" -> no file`);
          continue;
        }
        graph.get(file).add(target);
        const requested = new Set();
        if (ts.isImportDeclaration(statement)) {
          const clause = statement.importClause;
          if (clause?.name) requested.add('default');
          if (clause?.namedBindings) {
            if (ts.isNamespaceImport(clause.namedBindings)) requested.add('*');
            else {
              for (const binding of clause.namedBindings.elements) {
                requested.add((binding.propertyName ?? binding.name).text);
              }
            }
          }
        } else if (!statement.exportClause || ts.isNamespaceExport(statement.exportClause)) {
          requested.add('*');
        } else {
          for (const binding of statement.exportClause.elements) {
            requested.add((binding.propertyName ?? binding.name).text);
          }
        }
        const starExcludesDefault = ts.isExportDeclaration(statement) && !statement.exportClause;
        imports.push({ from: file, to: target, specifier, requested, starExcludesDefault });
        if (!sources.get(target).trim()) {
          add('EMPTY-TARGET', file, `${file} references "${specifier}" -> ${target} is empty`);
        }
      }
    }
    for (const edge of imports) {
      if (!sources.get(edge.to).trim()) continue;
      const exported = modules.get(edge.to);
      for (const name of edge.requested) {
        if (name === '*') continue;
        if (name === 'default' ? !exported.hasDefault : !exported.names.has(name)) {
          add(
            name === 'default' ? 'NO-DEFAULT' : 'MISSING-EXPORT',
            edge.from,
            `${edge.from} requests "${name}" from "${edge.specifier}" but ${edge.to} does not export it`
          );
        }
      }
    }
  } catch (error) {
    add('MODULE-ANALYSIS', '', `Module analysis could not certify this graph: ${error.message}`);
  }
  diagnostics.sort((a, b) =>
    `${a.file}:${a.code}:${a.msg}`.localeCompare(`${b.file}:${b.code}:${b.msg}`)
  );
  return { modules, graph, imports, diagnostics };
}

/** Shared closure comparison; explicit and namespace consumers use the same parsed graph. */
export function compareModuleExports(previous, current) {
  const diagnostics = [];
  for (const [file, before] of previous.modules) {
    const after = current.modules.get(file);
    const names = [...before.names, ...(before.hasDefault ? ['default'] : [])];
    for (const name of names) {
      if (name === 'default' ? after?.hasDefault : after?.names.has(name)) continue;
      const consumers = current.imports.filter(
        (edge) =>
          edge.to === file &&
          (edge.requested.has(name) ||
            (edge.requested.has('*') && !(name === 'default' && edge.starExcludesDefault)))
      );
      diagnostics.push({
        level: consumers.length ? 'FAIL' : 'WARN',
        code: consumers.length ? 'EXPORT-REGRESSION' : 'EXPORT-LOST',
        file,
        msg: `${file} no longer exports "${name}"${consumers.length ? `; consumers: ${consumers.map((edge) => edge.from).join(', ')}` : ' (no live consumers)'}`,
      });
    }
  }
  return diagnostics;
}
