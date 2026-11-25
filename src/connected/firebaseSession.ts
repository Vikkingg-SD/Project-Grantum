import { getApps, initializeApp } from '@firebase/app';
import {
  connectAuthEmulator,
  initializeAuth,
  inMemoryPersistence,
  type Auth,
} from '@firebase/auth';

const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '';
const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '';
export const localAuthOrigin = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_ORIGIN ?? '';
const authDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
export const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
let auth: Auth | undefined;

export function grantumAuth() {
  if (auth) return auth;
  if (localAuthOrigin) {
    if (
      !__DEV__ ||
      projectId !== 'demo-grantum-local' ||
      !/^http:\/\/(?:127\.0\.0\.1|localhost|10\.0\.2\.2):59099$/.test(localAuthOrigin)
    ) {
      throw new Error('The Firebase emulator is limited to Grantum’s local development build.');
    }
  } else if (!apiKey || !projectId || projectId.startsWith('demo-') || !authDomain) {
    throw new Error('Configure a Grantum Firebase project before signing in.');
  }
  const name = 'grantum-connected';
  const app =
    getApps().find((item) => item.name === name) ??
    initializeApp({ apiKey: apiKey || 'demo-grantum-local', authDomain, projectId }, name);
  auth = initializeAuth(app, { persistence: inMemoryPersistence });
  if (localAuthOrigin) connectAuthEmulator(auth, localAuthOrigin, { disableWarnings: true });
  return auth;
}
