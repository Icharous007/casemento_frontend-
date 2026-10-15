import { useCallback } from 'react';
import { useNavigate, type NavigateOptions, type To } from 'react-router-dom';
import { runWithViewTransition, type TransitionDirection } from '../utils/viewTransition';

export interface AnimatedNavigateOptions extends NavigateOptions {
  direction?: TransitionDirection;
}

/**
 * Wraps React Router's `useNavigate` with directional View Transitions
 * (`login-to-home`, `forward`, `back`) and graceful fallback.
 */
export function useAnimatedNavigate() {
  const navigate = useNavigate();

  return useCallback(
    (to: To, options?: AnimatedNavigateOptions) => {
      const { direction = 'forward', ...navigateOptions } = options ?? {};
      runWithViewTransition(() => {
        void navigate(to, navigateOptions);
      }, direction);
    },
    [navigate],
  );
}
