import { focusManager } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

/**
 * React Query listens to the browser "visibilitychange" event to refetch on
 * focus. React Native has no such event, so we connect AppState instead:
 * when the app comes back to the foreground, stale queries refetch.
 */
export function connectReactQueryToAppState(): void {
  if (Platform.OS === 'web') return;
  focusManager.setEventListener((handleFocus) => {
    const subscription = AppState.addEventListener('change', (status) =>
      handleFocus(status === 'active'),
    );
    return () => subscription.remove();
  });
}
