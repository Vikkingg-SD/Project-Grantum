module.exports = ({ config }) => {
  const android = { ...config.android };
  const ios = { ...config.ios };
  const plugins = [...(config.plugins ?? [])];
  if (process.env.GRANTUM_ANDROID_PACKAGE) android.package = process.env.GRANTUM_ANDROID_PACKAGE;
  if (process.env.GRANTUM_IOS_BUNDLE_ID) ios.bundleIdentifier = process.env.GRANTUM_IOS_BUNDLE_ID;
  if (process.env.GRANTUM_GOOGLE_SERVICES_FILE) {
    android.googleServicesFile = process.env.GRANTUM_GOOGLE_SERVICES_FILE;
  }
  if (process.env.GRANTUM_GOOGLE_IOS_PLIST) {
    ios.googleServicesFile = process.env.GRANTUM_GOOGLE_IOS_PLIST;
  }
  if (android.googleServicesFile || ios.googleServicesFile) {
    plugins.push('@react-native-google-signin/google-signin');
  }
  return { ...config, android, ios, plugins };
};
