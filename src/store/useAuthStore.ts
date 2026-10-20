import { create } from 'zustand';

interface AuthState {
  token: string | null;
  isOnboarded: boolean;
  status: 'anonymous' | 'authenticated';
  setSession: (token: string, isOnboarded: boolean) => void;
  markOnboarded: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isOnboarded: false,
  status: 'anonymous',
  setSession: (token, isOnboarded) => set({ token, isOnboarded, status: 'authenticated' }),
  markOnboarded: () => set({ isOnboarded: true }),
  logout: () => set({ token: null, isOnboarded: false, status: 'anonymous' }),
}));
