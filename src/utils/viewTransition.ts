import { flushSync } from 'react-dom';

export type TransitionDirection = 'login-to-home' | 'forward' | 'back';

interface ViewTransitionLike {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
}

type StartViewTransitionFn = (callback: () => void | Promise<void>) => ViewTransitionLike;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Executes a route/state update inside the browser's View Transitions API
 * when supported, setting `data-vt-direction` on `<html>` so CSS can
 * choreograph directional animations (`login-to-home`, `forward`, `back`).
 */
export function runWithViewTransition(
  callback: () => void,
  direction: TransitionDirection = 'forward',
): void {
  if (typeof document === 'undefined') {
    callback();
    return;
  }

  const root = document.documentElement;
  root.dataset.lastNavDirection = direction;

  const docWithVT = document as Document & {
    startViewTransition?: StartViewTransitionFn;
  };

  if (prefersReducedMotion() || typeof docWithVT.startViewTransition !== 'function') {
    callback();
    return;
  }

  root.dataset.vtDirection = direction;

  try {
    const transition = docWithVT.startViewTransition(() => {
      flushSync(() => {
        callback();
      });
    });

    void transition.finished.finally(() => {
      if (root.dataset.vtDirection === direction) {
        delete root.dataset.vtDirection;
      }
    });
  } catch {
    delete root.dataset.vtDirection;
    callback();
  }
}
