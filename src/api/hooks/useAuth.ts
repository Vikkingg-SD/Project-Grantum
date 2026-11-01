import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDataSource } from '../dataSource';
import { queryKeys } from '../queryKeys';
import { getSessionToken, useAuthStore } from '@/store/useAuthStore';
import { useUIStore } from '@/store/useUIStore';
import { useDraftStore } from '@/store/useDraftStore';

export function useAuth() {
  const client = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const clearUserState = async () => {
    await client.cancelQueries();
    client.clear();
    useUIStore.getState().setActiveGrantId('');
    useDraftStore.setState({ drafts: {} });
  };
  const me = useQuery({
    queryKey: queryKeys.me,
    queryFn: async () => {
      if (!(await getSessionToken())) return null;
      return getDataSource().getMe();
    },
    retry: false,
  });
  const login = useMutation({
    mutationFn: async (provider: string) => {
      const result = await getDataSource().oauthLogin(provider);
      await useAuthStore.getState().setSession(result.token, !result.isNewUser);
      await clearUserState();
      return result;
    },
  });
  const logout = useMutation({
    mutationFn: async () => {
      await useAuthStore.getState().logout();
      await clearUserState();
    },
  });
  const magicLink = useMutation({
    mutationFn: (email: string) => getDataSource().sendMagicLink(email),
  });
  const finishOnboarding = useMutation({
    mutationFn: () => getDataSource().finishOnboarding(),
    onSuccess: () => {
      useAuthStore.getState().markOnboarded();
      void client.invalidateQueries({ queryKey: queryKeys.me });
    },
  });
  return { status, me, login, logout, magicLink, finishOnboarding };
}
