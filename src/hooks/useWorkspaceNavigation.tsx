import React, { createContext, useContext, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { create } from 'zustand';
import {
  usePathname,
  useRootNavigationState,
  useRouter,
  useUnstableGlobalHref,
  type Href,
} from 'expo-router';
import { VIEW_PATHS } from './useActiveView';

const previousDestinationLimit = 10;
const workspacePaths = new Set([
  '/discover',
  '/my-works',
  '/project-profile',
  '/settings',
  '/plans',
  '/admin',
]);
const lifecycleViews = new Set<string>(Object.values(VIEW_PATHS));

function isLifecyclePath(pathname: string) {
  const [, root, grant, view, extra] = pathname.split('/');
  return root === 'grants' && Boolean(grant && lifecycleViews.has(view)) && extra === undefined;
}

function isWorkspacePath(href: string) {
  const pathname = href.split(/[?#]/, 1)[0];
  return workspacePaths.has(pathname) || isLifecyclePath(pathname);
}

type Visit = { key: string; href: string };
type History = { visits: Visit[]; index: number };
type RootNavigationState = ReturnType<typeof useRootNavigationState>;
type ChildNavigationState = RootNavigationState['routes'][number]['state'];
// Browser Forward can reset the navigation tree and remount the root layout.
// Keep the trail and resume target for the current app session.
const useHistory = create<History>(() => ({ visits: [], index: -1 }));
let lastLifecycle: string | null = null;

function rememberLifecycle(destination: string) {
  if (isLifecyclePath(destination.split(/[?#]/, 1)[0])) lastLifecycle = destination;
}

function focusedRouteKey(state: ChildNavigationState): string | undefined {
  if (!state) return;
  const route = state.routes[state.index ?? state.routes.length - 1];
  return route?.state ? focusedRouteKey(route.state) : route?.key;
}

function recordVisit(history: History, visit: Visit, browserTraversal: boolean): History {
  const { visits, index } = history;
  const previousIndex = visits.findIndex((entry) => entry.key === visit.key);
  if (previousIndex !== -1) {
    if (previousIndex === index && visits[index].href === visit.href) return history;
    const updated = [...visits];
    updated[previousIndex] = visit;
    return { visits: updated, index: previousIndex };
  }
  const next = browserTraversal ? [visit] : [...visits.slice(0, index + 1), visit];
  const bounded = next.slice(-(previousDestinationLimit + 1));
  return { visits: bounded, index: bounded.length - 1 };
}

type WorkspaceNavigation = {
  canGoBack: boolean;
  goBack: () => void;
  goHome: () => void;
  rememberLifecycle: (href: string) => void;
};
const NavigationContext = createContext<WorkspaceNavigation | null>(null);

export function WorkspaceNavigationProvider({ children }: React.PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const href = useUnstableGlobalHref();
  const state = useRootNavigationState();
  const history = useHistory();
  const returning = useRef(false);
  const current = history.visits[history.index];

  useEffect(() => {
    if (Platform.OS === 'web') {
      const observe = (browserTraversal: boolean) => {
        returning.current = false;
        // Expo Router gives the browser entry an id and restores it on Back or Forward.
        const key = window.history.state?.id;
        if (typeof key !== 'string') return;
        const browserHref = window.location.pathname + window.location.search;
        useHistory.setState((value) =>
          recordVisit(value, { key, href: browserHref }, browserTraversal)
        );
      };
      // Expo's linking listener publishes browser history after the router state changes.
      const frame = window.requestAnimationFrame(() => observe(false));
      const onPopState = () => observe(true);
      window.addEventListener('popstate', onPopState, true);
      return () => {
        window.cancelAnimationFrame(frame);
        window.removeEventListener('popstate', onPopState, true);
      };
    }
    const key = focusedRouteKey(state);
    if (key) {
      returning.current = false;
      useHistory.setState((value) => recordVisit(value, { key, href }, false));
    }
  }, [href, state]);

  const previousIndex = history.visits.findLastIndex(
    (entry, index) =>
      index < history.index && entry.href !== current?.href && isWorkspacePath(entry.href)
  );
  const canGoBack =
    previousIndex !== -1 &&
    isWorkspacePath(pathname) &&
    current?.href.split(/[?#]/, 1)[0] === pathname;

  return (
    <NavigationContext.Provider
      value={{
        canGoBack,
        goBack: () => {
          if (!canGoBack || returning.current) return;
          if (Platform.OS === 'web') {
            returning.current = true;
            window.history.go(previousIndex - history.index);
          } else if (router.canGoBack()) {
            router.back();
          }
        },
        goHome: () => {
          const destination = lastLifecycle ?? '/dashboard';
          if (href !== destination) router.push(destination as Href);
        },
        rememberLifecycle,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useWorkspaceNavigation() {
  const navigation = useContext(NavigationContext);
  if (!navigation) throw new Error('Workspace navigation requires the root layout');
  return navigation;
}

export function useRememberLifecycle(grantId: string) {
  const { rememberLifecycle } = useWorkspaceNavigation();
  const href = useUnstableGlobalHref();
  useEffect(() => {
    if (grantId && href.startsWith(`/grants/${encodeURIComponent(grantId)}/`))
      rememberLifecycle(href);
  }, [grantId, href, rememberLifecycle]);
}
