import { useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, View } from 'react-native';
import { ApiError } from '@/api/client';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from '@firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '@/components/atoms/AppButton';
import { AppInput } from '@/components/atoms/AppInput';
import { AppText } from '@/components/atoms/AppText';
import { useThemeStore } from '@/store/useThemeStore';
import { connectedApi, uuidPattern, type Dashboard, type Session } from './api';
import { grantumAuth, localAuthOrigin } from './firebaseSession';
import { googleLogin } from './googleLogin';
import { actionStyles, ActionMessage, Card, QueryMessage, useAction } from './ui';
import { DiscoveryPane, WorksPane } from './DiscoveryPane';
import { ProjectPane } from './ProjectPane';
import { AttemptPane } from './AttemptPane';
import { BountyPane, InboxPane, SettingsPane } from './ServicesPane';

const views = [
  'Dashboard',
  'Discovery',
  'My Works',
  'Project Profile',
  'Bounty Hunt',
  'Inbox',
  'Settings',
  'Staff',
  'Application',
  'Plans',
  'Affiliate',
] as const;
type ViewName = (typeof views)[number];

export function ConnectedWorkspace() {
  const [firebaseUser, setFirebaseUser] = useState<User | null | undefined>(undefined);
  const [authError, setAuthError] = useState('');
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void Promise.resolve().then(() => {
      if (!active) return;
      try {
        unsubscribe = onAuthStateChanged(grantumAuth(), setFirebaseUser);
      } catch (failure) {
        setAuthError(
          failure instanceof Error ? failure.message : 'Grantum sign-in is unavailable.'
        );
      }
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const session = useQuery({
    queryKey: ['connected', 'session', firebaseUser?.uid],
    queryFn: async () => {
      try {
        return { member: await connectedApi(firebaseUser ?? undefined).session(), denied: null };
      } catch (error) {
        if (error instanceof ApiError && [401, 403].includes(error.status)) {
          return { member: null, denied: error };
        }
        throw error;
      }
    },
    enabled: Boolean(firebaseUser),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    retry: false,
  });

  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void queryClient.invalidateQueries({ queryKey: ['connected'] });
    });
    return () => listener.remove();
  }, [queryClient]);

  useEffect(() => {
    if (session.data?.denied) {
      queryClient.removeQueries({
        predicate: ({ queryKey }) => queryKey[0] === 'connected' && queryKey[1] !== 'session',
      });
    }
  }, [session.data?.denied, queryClient]);

  async function logout() {
    await queryClient.cancelQueries({ queryKey: ['connected'] });
    await signOut(grantumAuth());
    queryClient.removeQueries({ queryKey: ['connected'] });
  }

  return (
    <SafeAreaView style={styles.viewport}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <AppText variant="h1" color="primary">
          Grantum
        </AppText>
        {authError ? (
          <AppText accessibilityRole="alert" color="failureText">
            {authError}
          </AppText>
        ) : firebaseUser === undefined ? (
          <AppText>Checking your session…</AppText>
        ) : !firebaseUser ? (
          <LoginPane />
        ) : !session.data?.member ? (
          <View style={actionStyles.block}>
            <QueryMessage
              pending={session.isPending}
              error={session.data?.denied ?? session.error}
              retry={() => void session.refetch()}
            />
            <AppButton label="Sign out" onPress={() => void logout()} />
          </View>
        ) : (
          <SignedIn
            key={firebaseUser.uid}
            member={session.data.member}
            firebaseUser={firebaseUser}
            logout={logout}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LoginPane() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const action = useAction();
  return (
    <Card>
      <AppText variant="h2">Sign in to your workspace</AppText>
      {localAuthOrigin ? (
        <>
          <AppText color="muted">
            Sign in with a test account from the local Firebase emulator.
          </AppText>
          <AppInput
            label="Test account email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <AppInput
            label="Test account password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          <AppButton
            label="Sign in to local Grantum"
            variant="primary"
            disabled={!email.trim() || !password}
            isLoading={action.busy}
            onPress={() =>
              void action.run(async () => {
                await signInWithEmailAndPassword(grantumAuth(), email.trim(), password);
                setPassword('');
              })
            }
          />
        </>
      ) : (
        <AppButton
          label="Sign in with Google"
          variant="primary"
          isLoading={action.busy}
          onPress={() => void action.run(googleLogin)}
        />
      )}
      <ActionMessage action={action} />
    </Card>
  );
}

function SignedIn({
  member,
  firebaseUser,
  logout,
}: {
  member: Session;
  firebaseUser: User;
  logout: () => Promise<void>;
}) {
  const params = useLocalSearchParams<{ view?: string; attemptId?: string; grantId?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const api = connectedApi(firebaseUser);
  const key = ['connected', member.id] as const;
  const action = useAction();
  const theme = useThemeStore((state) => state.mode);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const view = views.find((item) => item === params.view) ?? 'Dashboard';

  function open(next: ViewName, attemptId?: string, grantId?: string) {
    if (next === view && (!attemptId || attemptId === params.attemptId)) return;
    router.push({
      pathname: '/connected',
      params: { view: next, ...(attemptId && { attemptId }), ...(grantId && { grantId }) },
    });
  }
  function openAttempt(id: string, grantId: string) {
    open('Application', id, grantId);
  }

  if (!member.isOnboarded) {
    return (
      <Card>
        <AppText variant="h2">Welcome, {member.displayName}</AppText>
        <AppText>Create a project and keep each application separate.</AppText>
        <AppButton
          label="Set up my workspace"
          variant="primary"
          onPress={() =>
            void action.run(async () => {
              await api.post('/auth/onboarding');
              await queryClient.invalidateQueries({
                queryKey: ['connected', 'session', firebaseUser.uid],
              });
            })
          }
          isLoading={action.busy}
        />
        <AppButton label="Sign out" onPress={() => void action.run(logout)} />
        <ActionMessage action={action} />
      </Card>
    );
  }

  const navigation: ViewName[] = [
    'Dashboard',
    'Discovery',
    'My Works',
    'Project Profile',
    'Bounty Hunt',
    'Inbox',
    'Settings',
    'Plans',
    'Affiliate',
  ];
  if (member.staff) navigation.push('Staff');
  return (
    <>
      <View style={actionStyles.row}>
        <AppButton label={theme === 'dark' ? 'Light theme' : 'Dark theme'} onPress={toggleTheme} />
        <AppButton
          label="Sign out"
          onPress={() => void action.run(logout)}
          isLoading={action.busy}
        />
      </View>
      <ActionMessage action={action} />
      <View style={actionStyles.row}>
        {navigation.map((item) => (
          <AppButton
            key={item}
            label={item}
            size="sm"
            variant="outline"
            selected={view === item}
            onPress={() => open(item)}
          />
        ))}
      </View>
      {view === 'Dashboard' && (
        <DashboardPane
          api={api}
          scope={key}
          openDiscovery={() => open('Discovery')}
          openAttempt={openAttempt}
        />
      )}
      {view === 'Discovery' && (
        <DiscoveryPane
          api={api}
          scope={key}
          openAttempt={openAttempt}
          openProjects={() => open('Project Profile')}
        />
      )}
      {view === 'My Works' && (
        <WorksPane
          api={api}
          scope={key}
          openAttempt={openAttempt}
          openDiscovery={() => open('Discovery')}
        />
      )}
      {view === 'Project Profile' && <ProjectPane api={api} scope={key} />}
      {view === 'Bounty Hunt' && <BountyPane api={api} scope={key} />}
      {view === 'Staff' &&
        (member.staff ? (
          <BountyPane api={api} scope={key} staff />
        ) : (
          <AppText>Staff access is required.</AppText>
        ))}
      {view === 'Inbox' && <InboxPane api={api} scope={key} />}
      {view === 'Settings' && (
        <SettingsPane
          api={api}
          member={member}
          refresh={() =>
            queryClient.invalidateQueries({ queryKey: ['connected', 'session', firebaseUser.uid] })
          }
        />
      )}
      {view === 'Application' &&
        (typeof params.attemptId === 'string' && uuidPattern.test(params.attemptId) ? (
          <AttemptPane
            key={params.attemptId}
            api={api}
            scope={key}
            attemptId={params.attemptId}
            grantId={params.grantId}
            staff={member.staff}
          />
        ) : (
          <AppText accessibilityRole="alert">
            Application unavailable. Open an attempt from My Works.
          </AppText>
        ))}
      {view === 'Plans' && (
        <Card>
          <AppText variant="h2">Plans</AppText>
          <AppText>
            Connected checkout is unavailable until Grantum has a billing provider and published
            prices.
          </AppText>
        </Card>
      )}
      {view === 'Affiliate' && (
        <Card>
          <AppText variant="h2">Affiliate</AppText>
          <AppText>Referral credits and payouts require a connected payout provider.</AppText>
        </Card>
      )}
    </>
  );
}

function DashboardPane({
  api,
  scope,
  openDiscovery,
  openAttempt,
}: {
  api: ReturnType<typeof connectedApi>;
  scope: readonly string[];
  openDiscovery: () => void;
  openAttempt: (id: string, grantId: string) => void;
}) {
  const query = useQuery({
    queryKey: [...scope, 'dashboard'],
    queryFn: () => api.get<Dashboard>('/dashboard/summary'),
  });
  const next = query.data?.activeDraft;
  return (
    <Card>
      <AppText variant="h2">
        {query.data ? 'Welcome, ' + query.data.greetingName : 'Dashboard'}
      </AppText>
      <QueryMessage
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
      {query.data?.pipeline.map((stage) => (
        <AppText key={stage.label}>
          {stage.label} · {stage.count}
        </AppText>
      ))}
      <AppButton label="Browse opportunities" variant="primary" onPress={openDiscovery} />
      {next && (
        <AppButton
          label={'Resume ' + next.title}
          onPress={() => openAttempt(next.attemptId, next.grantId)}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1 },
  content: {
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 32,
    maxWidth: 880,
    width: '100%',
    alignSelf: 'center',
  },
});
