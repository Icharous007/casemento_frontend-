import { flushSync } from 'react-dom';
import type { TransitionEffect } from './galleryTransition';

export type TransitionDirection = 'login-to-home' | 'forward' | 'back';

interface TransitionOptions {
  effect?: TransitionEffect;
  photoUrl?: string | null;
}

interface ViewTransitionLike {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
}

type StartViewTransitionFn = (callback: () => void | Promise<void>) => ViewTransitionLike;

const TRANSITION_EVENT = 'casamento:gallery-transition';
let transitionSequence = 0;

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Runs a route update with a randomized gallery-photo overlay and transition
 * effect when the browser supports View Transitions.
 */
export function runWithViewTransition(
  callback: () => void,
  direction: TransitionDirection = 'forward',
  options: TransitionOptions = {},
): void {
  if (typeof document === 'undefined') {
    callback();
    return;
  }

  const root = document.documentElement;
  root.dataset.lastNavDirection = direction;
  if (prefersReducedMotion()) {
    callback();
    return;
  }

  if (options.effect) root.dataset.vtEffect = options.effect;

  const docWithVT = document as Document & {
    startViewTransition?: StartViewTransitionFn;
  };
  const transitionId = String(++transitionSequence);

  const update = () => {
    window.dispatchEvent(new CustomEvent(TRANSITION_EVENT, {
      detail: { id: transitionId, photoUrl: options.photoUrl ?? null, active: true },
    }));
    callback();
  };

  const cleanup = () => {
    window.dispatchEvent(new CustomEvent(TRANSITION_EVENT, {
      detail: { id: transitionId, photoUrl: null, active: false },
    }));
    if (root.dataset.vtId === transitionId) {
      delete root.dataset.vtId;
      delete root.dataset.vtDirection;
      delete root.dataset.vtEffect;
    }
  };

  if (typeof docWithVT.startViewTransition !== 'function') {
    root.dataset.vtId = transitionId;
    update();
    window.setTimeout(cleanup, 900);
    return;
  }

  root.dataset.vtId = transitionId;
  root.dataset.vtDirection = direction;

  try {
    const transition = docWithVT.startViewTransition(() => {
      flushSync(() => {
        update();
      });
    });

    void transition.finished.then(cleanup, cleanup);
  } catch {
    update();
    window.setTimeout(cleanup, 900);
  }
}
