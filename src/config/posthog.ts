import Constants from 'expo-constants';
import PostHog from 'posthog-react-native';

type PostHogConfig = {
  projectToken?: string;
  host?: string;
};

const config = Constants.expoConfig?.extra?.posthog as PostHogConfig | undefined;
const projectToken = config?.projectToken;
const host = config?.host;

export const isPostHogConfigured = Boolean(projectToken && host);

if (__DEV__) {
  if (!projectToken) {
    console.error(
      'EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN is configured'
    );
  }

  if (!host) {
    console.error(
      'EXPO_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once EXPO_PUBLIC_POSTHOG_HOST is configured'
    );
  }
}

export const posthog = isPostHogConfigured
  ? new PostHog(projectToken!, {
      host: host!,
      captureAppLifecycleEvents: true,
      logs: {
        serviceName: 'grantum-mobile',
        environment: __DEV__ ? 'development' : 'production',
      },
      errorTracking: {
        autocapture: {
          uncaughtExceptions: true,
          unhandledRejections: true,
          console: [],
        },
      },
    })
  : undefined;
