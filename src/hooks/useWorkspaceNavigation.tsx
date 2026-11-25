import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { BackHandler, Platform } from 'react-native';
import { create } from 'zustand';
import {
  useNavigationContainerRef,
  usePathname,
  useRouter,
  useUnstableGlobalHref,
  type Href,
} from 'expo-router';
import {
  applyFallbackBack,
  canUseNativeRouterBack,
  findPreviousBackIndex,
  isLifecyclePath,
  isWorkspaceShellPath,
  normalizePathname,
  reconcileNativeHistory,
  recordHistoryVisit,
  resolveHomeDestination,
  workspaceDestination,
  type NavHistory,
} from '@/utils/navigationHistory';
import { dismissTopEscapeLayer } from '@/hooks/useEscapeDismiss';

type NavigationContainer = ReturnType<typeof useNavigationContainerRef>;
type RootNavigationState = NonNullable<ReturnType<NavigationContainer['getRootState']>>;
type ChildNavigationState = RootNavigationState | RootNavigationState['routes'][number]['state'];

interface HistoryStoreState extends NavHistory {
  invalidPaths: string[];
}

// Browser Forward can reset the navigation tree and remount the root layout.
// Keep the trail, invalid-route blacklist, and resume target for the current app session.
const useHistory = create<HistoryStoreState>(() => ({
  visits: [],
  index: -1,
  invalidPaths: [],
}));
let lastLifecycle: string | null = null;

function rememberLifecycle(destination: string) {
  const clean = workspaceDestination(destination);
  if (isLifecyclePath(clean)) lastLifecycle = clean;
}

function markInvalidPath(destination: string) {
  const clean = workspaceDestination(destination);
  if (lastLifecycle === clean) lastLifecycle = null;
  useHistory.setState((state) =>
    state.invalidPaths.includes(clean)
      ? state
      : { invalidPaths: [...state.invalidPaths.slice(-49), clean] }
  );
}

function clearInvalidPath(destination: string) {
  const clean = workspaceDestination(destination);
  useHistory.setState((state) =>
    state.invalidPaths.includes(clean)
      ? { invalidPaths: state.invalidPaths.filter((item) => item !== clean) }
      : state
  );
}

function focusedRouteKeys(state: ChildNavigationState): string[] {
  if (!state) return [];
  const route = state.routes[state.index ?? state.routes.length - 1];
  return route?.key ? [route.key, ...focusedRouteKeys(route.state)] : [];
}

function collectActiveRouteKeys(state: ChildNavigationState, acc: string[] = []): string[] {
  if (!state) return acc;
  for (const route of state.routes) {
    const previousLength = acc.length;
    if (route.state) collectActiveRouteKeys(route.state, acc);
    if (acc.length === previousLength && route.key) acc.push(route.key);
  }
  return acc;
}

export interface WorkspaceNavigationApi {
  canGoBack: boolean;
  previousHref: string | null;
  goBack: () => void;
  goHome: () => void;
  rememberLifecycle: (href: string) => void;
  markInvalidPath: (href: string) => void;
  clearInvalidPath: (href: string) => void;
}

const NavigationContext = createContext<WorkspaceNavigationApi | null>(null);

export function WorkspaceNavigationProvider({ children }: React.PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const href = useUnstableGlobalHref();
  const navigationRef = useNavigationContainerRef();
  const visits = useHistory((s) => s.visits);
  const index = useHistory((s) => s.index);
  const invalidPaths = useHistory((s) => s.invalidPaths);
  const returning = useRef(false);
  const departingKey = useRef<string | null>(null);
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearReturnTimer = useCallback(() => {
    if (returnTimer.current !== null) {
      clearTimeout(returnTimer.current);
      returnTimer.current = null;
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      let frame = 0;
      let retryAttempts = 0;
      const observe = (browserTraversal: boolean) => {
        // Expo Router gives the browser entry an id and restores it on Back or Forward.
        const key = window.history.state?.id;
        if (typeof key !== 'string') {
          if (!browserTraversal && retryAttempts < 10) {
            retryAttempts += 1;
            frame = window.requestAnimationFrame(() => observe(false));
          }
          return;
        }
        // Ignore a departing-frame rAF while an async history.go() is still awaiting popstate.
        if (
          !browserTraversal &&
          returning.current &&
          departingKey.current &&
          key === departingKey.current
        ) {
          return;
        }
        returning.current = false;
        departingKey.current = null;
        clearReturnTimer();
        const browserHref = window.location.pathname + window.location.search;
        useHistory.setState((value) => {
          const next = recordHistoryVisit(
            { visits: value.visits, index: value.index },
            { key, href: browserHref },
            browserTraversal
          );
          if (next.visits === value.visits && next.index === value.index) return value;
          return { visits: next.visits, index: next.index };
        });
      };
      // Observe immediately when browser URL already reflects the committed route,
      // and re-check on the next animation frame after Expo's linking listener publishes.
      if (
        typeof window.history.state?.id === 'string' &&
        normalizePathname(window.location.pathname) === normalizePathname(pathname)
      ) {
        observe(false);
      }
      frame = window.requestAnimationFrame(() => observe(false));
      const onPopState = () => observe(true);
      window.addEventListener('popstate', onPopState, true);
      return () => {
        window.cancelAnimationFrame(frame);
        window.removeEventListener('popstate', onPopState, true);
      };
    }
    // The layout-level snapshot can still hold a partial deep-link state without leaf keys.
    const state = navigationRef.getRootState();
    const focusedKeys = focusedRouteKeys(state);
    const key = focusedKeys.at(-1);
    if (key) {
      if (returning.current && departingKey.current && key === departingKey.current) {
        return;
      }
      returning.current = false;
      departingKey.current = null;
      clearReturnTimer();
      const activeKeys = collectActiveRouteKeys(state);
      useHistory.setState((value) => {
        const next = reconcileNativeHistory(
          { visits: value.visits, index: value.index },
          activeKeys,
          { key, href, nativeParentKeys: focusedKeys.slice(0, -1) }
        );
        if (next.visits === value.visits && next.index === value.index) return value;
        return { visits: next.visits, index: next.index };
      });
    }
  }, [clearReturnTimer, href, navigationRef, pathname]);

  useEffect(() => clearReturnTimer, [clearReturnTimer]);

  const invalidSet = useMemo(() => new Set(invalidPaths), [invalidPaths]);
  const previousIndex = findPreviousBackIndex({ visits, index }, href, invalidSet);
  const previousHref = previousIndex !== -1 ? visits[previousIndex].href : null;
  const canGoBack = previousIndex !== -1;

  const goBack = useCallback(() => {
    if (!canGoBack || returning.current || previousIndex === -1) return;
    const target = visits[previousIndex];
    if (!target) return;
    if (Platform.OS === 'web') {
      const currentBrowserKey =
        typeof window.history.state?.id === 'string' ? window.history.state.id : null;
      returning.current = true;
      departingKey.current = currentBrowserKey;
      clearReturnTimer();
      const targetHref = target.href;
      // Guard against browser history truncation where history.go does not emit popstate.
      returnTimer.current = setTimeout(() => {
        if (!returning.current) return;
        returning.current = false;
        departingKey.current = null;
        returnTimer.current = null;
        const latestKey =
          typeof window.history.state?.id === 'string' ? window.history.state.id : null;
        useHistory.setState((current) => {
          const next = applyFallbackBack(
            { visits: current.visits, index: current.index },
            previousIndex,
            latestKey,
            targetHref
          );
          return { visits: next.visits, index: next.index };
        });
        router.replace(targetHref as Href);
      }, 400);
      window.history.go(previousIndex - index);
      return;
    }
    const state = navigationRef.getRootState();
    const currentNativeKey = focusedRouteKeys(state).at(-1) ?? null;
    const activeKeys = collectActiveRouteKeys(state);
    returning.current = true;
    departingKey.current = currentNativeKey;
    clearReturnTimer();
    returnTimer.current = setTimeout(() => {
      returning.current = false;
      departingKey.current = null;
      returnTimer.current = null;
    }, 400);
    if (canUseNativeRouterBack(activeKeys, target.key) && router.canGoBack()) {
      router.back();
    } else {
      useHistory.setState((current) => {
        const next = applyFallbackBack(
          { visits: current.visits, index: current.index },
          previousIndex,
          null,
          target.href
        );
        return { visits: next.visits, index: next.index };
      });
      router.replace(target.href as Href);
    }
  }, [canGoBack, clearReturnTimer, index, navigationRef, previousIndex, router, visits]);

  const goHome = useCallback(() => {
    const destination = resolveHomeDestination(href, lastLifecycle, invalidSet);
    if (!destination) return;
    router.push(destination as Href);
  }, [href, invalidSet, router]);

  // Single root web Escape coordinator:
  // 1. Open dialog/modal (RN Web Modal handles Escape on keyup)
  // 2. Focused text input / textarea / select / contentEditable -> blur
  // 3. Open non-modal expandable panel/dropdown (LIFO) -> dismiss
  // 4. In-app Back navigation (only when canGoBack is true)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key !== 'Escape' ||
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.keyCode === 229 ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) {
        return;
      }
      if (document.querySelector('[role="dialog"], [aria-modal="true"]')) {
        return;
      }
      const focused = document.activeElement;
      if (
        focused instanceof HTMLInputElement ||
        focused instanceof HTMLTextAreaElement ||
        focused instanceof HTMLSelectElement ||
        (focused instanceof HTMLElement && focused.isContentEditable)
      ) {
        focused.blur();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (dismissTopEscapeLayer()) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (canGoBack) {
        goBack();
        event.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [canGoBack, goBack]);

  // Android hardware Back uses the exact same guarded workspace trail so Back
  // cannot pop into onboarding or staff administration.
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack) {
        goBack();
        return true;
      }
      if (isWorkspaceShellPath(pathname) && router.canGoBack()) {
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [canGoBack, goBack, pathname, router]);

  const value = useMemo<WorkspaceNavigationApi>(
    () => ({
      canGoBack,
      previousHref,
      goBack,
      goHome,
      rememberLifecycle,
      markInvalidPath,
      clearInvalidPath,
    }),
    [canGoBack, goBack, goHome, previousHref]
  );

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

export function useWorkspaceNavigation() {
  const navigation = useContext(NavigationContext);
  if (!navigation) throw new Error('Workspace navigation requires the root layout');
  return navigation;
}

export function useRememberLifecycle(grantId: string) {
  const { rememberLifecycle: remember, clearInvalidPath: clearInvalid } = useWorkspaceNavigation();
  const href = useUnstableGlobalHref();
  useEffect(() => {
    const clean = workspaceDestination(href);
    if (grantId && clean.startsWith(`/grants/${encodeURIComponent(grantId)}/`)) {
      clearInvalid(clean);
      remember(clean);
    }
  }, [clearInvalid, grantId, href, remember]);
}
