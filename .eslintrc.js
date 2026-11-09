module.exports = {
  root: true,
  extends: ['expo', 'prettier'],
  plugins: ['prettier'],
  settings: {
    // The TypeScript compiler's generated library is checked by tsc, not parsed
    // recursively by import lint rules when a verifier imports the compiler.
    'import/ignore': [
      'node_modules[\\\\/]+@?react-native',
      'node_modules[\\\\/]+typescript[\\\\/]+lib',
    ],
  },
  ignorePatterns: ['node_modules/', '.expo/', 'dist/', 'web-build/', 'assets/', 'expo-env.d.ts'],
  rules: {
    'prettier/prettier': 'error',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'react-hooks/exhaustive-deps': 'error',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
  },
  overrides: [
    { files: ['scripts/**/*.ts'], rules: { 'no-console': 'off' } },
    { files: ['*.js', '*.cjs', '*.mjs'], rules: { '@typescript-eslint/no-unused-vars': 'off' } },
    { files: ['scripts/**/*.{js,cjs,mjs}'], env: { node: true } },
    {
      files: ['**/*.cts'],
      parser: require.resolve('@typescript-eslint/parser', {
        paths: [require.resolve('eslint-config-expo')],
      }),
    },
  ],
};
