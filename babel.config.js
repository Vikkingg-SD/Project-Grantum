const { createRequire } = require('node:module');

// Resolve Expo's own preset under pnpm's isolated dependency layout.
const expoRequire = createRequire(require.resolve('expo/package.json'));

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [expoRequire.resolve('babel-preset-expo')],
  };
};
