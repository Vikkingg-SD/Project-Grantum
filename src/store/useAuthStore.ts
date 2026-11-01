import { create } from 'zustand';

interface AuthState {
  token: string | null;
  status: 'anonymous' | 'authenticated';
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setSession: (token: string, isOnboarded: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

const SESSION_KEY = 'grantum-session-token';
let sessionVersion = 0;
let hydration: Promise<void> | null = null;
let writes: Promise<void> = Promise.resolve();

async function nativeStorage() {
  const { Platform } = await import('react-native');
  if (Platform.OS === 'web') return null;
  return import('expo-secure-store');
}

function writeToken(token: string | null): Promise<void> {
  const operation = writes
    .catch(() => undefined)
    .then(async () => {
      const storage = await nativeStorage();
      if (!storage) return;
      if (token) await storage.setItemAsync(SESSION_KEY, token);
      else await storage.deleteItemAsync(SESSION_KEY);
    });
  writes = operation;
  return operation;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  status: 'anonymous',
  hydrated: false,
  hydrate: () => {
    if (!hydration) {
      const version = sessionVersion;
      hydration = (async () => {
        const storage = await nativeStorage();
        const token = storage ? await storage.getItemAsync(SESSION_KEY) : null;
        if (version === sessionVersion) {
          set({ token, status: token ? 'authenticated' : 'anonymous', hydrated: true });
        }
      })().catch((error: unknown) => {
        hydration = null;
        throw error;
      });
    }
    return hydration;
  },
  setSession: async (token) => {
    if (!token.trim()) throw new Error('A session token is required.');
    const version = ++sessionVersion;
    await writeToken(token);
    if (version === sessionVersion) {
      set({ token, status: 'authenticated', hydrated: true });
    }
  },
  logout: async () => {
    ++sessionVersion;
    set({ token: null, status: 'anonymous', hydrated: true });
    await writeToken(null);
  },
}));

export async function getSessionToken(): Promise<string | null> {
  if (!useAuthStore.getState().hydrated) await useAuthStore.getState().hydrate();
  return useAuthStore.getState().token;
}
