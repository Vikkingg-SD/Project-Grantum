const app = require('./app.json');

module.exports = () => ({
  ...app.expo,
  extra: {
    ...app.expo.extra,
    posthog: {
      projectToken: process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN,
      host: process.env.EXPO_PUBLIC_POSTHOG_HOST,
    },
  },
});
