/**
 * Transitions.dev motion for framer-motion surfaces.
 *
 * Modals, dropdowns, the task panel, toasts and page changes mount and unmount
 * through React, so framer-motion runs them. These presets reproduce the
 * transitions.dev snippets with the same values as the :root tokens in
 * src/styles/transitions.css (durations, easings, scales, distances, blur),
 * so both halves of the app move on one motion scale.
 */
import type { Transition, Variants } from 'framer-motion';

type Bezier = [number, number, number, number];

/** --ease-smooth-out: modal / dropdown / panel open + close, page slide, resize. */
export const EASE_SMOOTH_OUT: Bezier = [0.22, 1, 0.36, 1];
/** --morph-ease: the bouncier open of the plus → menu morph. */
export const EASE_MORPH: Bezier = [0.34, 1.25, 0.64, 1];

const s = (ms: number) => ms / 1000;

/** Motion tokens, in ms. */
export const DUR = {
  stagger: 40,
  micro: 80,
  quick: 150,
  fast: 250,
  medium: 350,
  slow: 400,
  verySlow: 500,
} as const;

/** Respect prefers-reduced-motion the way every snippet's guard does. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

const tween = (ms: number, ease: Bezier = EASE_SMOOTH_OUT): Transition =>
  prefersReducedMotion() ? { duration: 0 } : { duration: s(ms), ease };

/* ── Modal open / close (06-modal) ─────────────────────────────
   Scale up from --modal-scale (0.96) over --modal-open-dur (250ms);
   close dips back to --modal-scale-close (0.96) over 150ms. */
export const modalMotion = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: tween(250) },
  exit: { opacity: 0, scale: 0.96, transition: tween(150) },
};

/** The dimmed backdrop behind a modal follows the modal's clocks. */
export const overlayMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: tween(250) },
  exit: { opacity: 0, transition: tween(150) },
};

/* ── Menu dropdown (05-menu-dropdown) ──────────────────────────
   Origin-aware: grows from --dropdown-pre-scale (0.97) at the corner
   nearest its trigger over 250ms; closes to 0.99 over 150ms. */
export type DropdownOrigin = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export function dropdownMotion(origin: DropdownOrigin = 'top-left') {
  return {
    initial: { opacity: 0, scale: 0.97 },
    animate: { opacity: 1, scale: 1, transition: tween(250) },
    exit: { opacity: 0, scale: 0.99, transition: tween(150) },
    style: { transformOrigin: origin.replace('-', ' ') },
  };
}

/* ── Panel reveal (07-panel-reveal) ────────────────────────────
   Slides in with a cross-blur of --panel-blur (2px): open 400ms,
   close 350ms. The task sheet enters from the side, so the travel
   runs on X. */
export function panelMotion(axis: 'x' | 'y' = 'y', distance = 100) {
  return {
    initial: { opacity: 0, [axis]: distance, filter: 'blur(2px)' },
    animate: { opacity: 1, [axis]: 0, filter: 'blur(0px)', transition: tween(400), transitionEnd: { filter: 'none' } },
    exit: { opacity: 0, [axis]: distance, filter: 'blur(2px)', transition: tween(350) },
  };
}

/* ── Toast open / close (22-toast) ─────────────────────────────
   Rises --toast-distance (16px) from scale 0.97 with a 2px cross-blur;
   slower in (350ms) than out (250ms). */
export const toastMotion = {
  initial: { opacity: 0, y: 16, scale: 0.97, filter: 'blur(2px)' },
  animate: { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', transition: tween(350), transitionEnd: { filter: 'none' } },
  exit: { opacity: 0, y: 16, scale: 0.97, filter: 'blur(2px)', transition: tween(250) },
};

/* ── Page side-by-side (08-page-side-by-side) ──────────────────
   Pages slide --page-slide-distance (8px) with a --page-blur (3px)
   cross-blur over 250ms. `custom` is the direction: 1 when moving to
   a later destination, -1 when moving back, so the outgoing page
   leaves on the side the new one arrives from. */
export const pageVariants: Variants = {
  initial: (dir: number) => ({ opacity: 0, x: 8 * (dir || 1), filter: 'blur(3px)' }),
  animate: { opacity: 1, x: 0, filter: 'blur(0px)', transition: tween(250), transitionEnd: { filter: 'none' } },
  exit: (dir: number) => ({ opacity: 0, x: -8 * (dir || 1), filter: 'blur(3px)', transition: tween(250) }),
};

/* ── Tabs sliding (16-tabs-sliding) ────────────────────────────
   The active pill travels between options over --tabs-dur (250ms). */
export const tabsTransition: Transition = tween(250);

/* ── Plus to menu morph (20-plus-menu-morph) ───────────────────
   The plus rotates --morph-rotate (45deg) into an × on the open clock. */
export const morphIconTransition = (open: boolean): Transition =>
  open ? tween(350, EASE_MORPH) : tween(250);

/* ── Texts reveal (18-texts-reveal), for framer-driven lists ───
   A blurred rise of --stagger-distance (12px) over 500ms. */
export const revealItem = (index = 0) => ({
  initial: { opacity: 0, y: 12, filter: 'blur(3px)' },
  animate: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { ...tween(500), delay: prefersReducedMotion() ? 0 : s(DUR.stagger * index) },
    transitionEnd: { filter: 'none' },
  },
});
