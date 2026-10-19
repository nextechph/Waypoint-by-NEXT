/**
 * React wiring for the Transitions.dev CSS snippets in src/styles/transitions.css.
 *
 * Each component renders the snippet's documented hooks (t-* classes and
 * data-/aria- state attributes) and ports its small JS orchestration, so the
 * CSS stays verbatim and the timing keeps reading from the :root variables.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const cssMs = (name: string, fallback: number) => {
  if (typeof document === 'undefined') return fallback;
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
  return Number.isFinite(v) ? v : fallback;
};
const cssVar = (name: string, fallback: string) =>
  (typeof document !== 'undefined' && getComputedStyle(document.documentElement).getPropertyValue(name).trim()) || fallback;

/* ── Checkbox check (25-checkbox-check) ───────────────────────
   The box fills, then the check stroke draws in. */
const CHECK_PATH = 'M1 5.52L3.92 9.17L9.17 1';
const CHECK_LEN = 15;

export function CheckBox({
  checked,
  onToggle,
  className = '',
  disabled,
  label,
  stopPropagation,
}: {
  checked: boolean;
  onToggle?: () => void;
  className?: string;
  disabled?: boolean;
  label: string;
  stopPropagation?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`t-check wp-tcheck ${className}${checked ? ' checked' : ''}`}
      onClick={e => { if (stopPropagation) e.stopPropagation(); onToggle?.(); }}
    >
      <svg viewBox="0 0 10.1668 10.1668" aria-hidden style={{ ['--check-len' as string]: CHECK_LEN }}>
        <path d={CHECK_PATH} />
      </svg>
    </button>
  );
}

/* ── Notification badge (03-notification-badge) ───────────────
   Slides a small dot onto its trigger and pops it. The trigger must be
   position: relative. */
export function Badge({ open, className = '', children }: { open: boolean; className?: string; children?: React.ReactNode }) {
  // Mount closed, then open on the next frame, so the slide-in plays on first appearance too.
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!open) { setShown(false); return; }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open]);
  return (
    <span className={`t-badge ${className}`} data-open={String(shown)} aria-hidden>
      <span className="t-badge-dot">{children}</span>
    </span>
  );
}

/* ── Learn more hover (24-learn-more-hover) ───────────────────
   Put `t-learn` on the hover target; the chevron slides and its arms
   spread into an arrow. */
export function LearnChevron({ size = 14 }: { size?: number }) {
  return (
    <span className="t-learn-chevron" aria-hidden>
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
        <path className="t-learn-arm t-learn-arm-top" d="M6 4L10 8" />
        <path className="t-learn-arm t-learn-arm-bot" d="M10 8L6 12" />
      </svg>
    </span>
  );
}

/* ── Toggle (27-toggle) ───────────────────────────────────────
   The thumb travels with a double-bounce overshoot. `.is-init` is added on
   first interaction so the "off" keyframes don't play on load. */
export function Toggle({
  on,
  onChange,
  disabled,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [init, setInit] = useState(false);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      data-on={String(on)}
      className={`t-toggle wp-toggle${init ? ' is-init' : ''}`}
      onClick={() => { setInit(true); onChange(!on); }}
    >
      <span className="t-toggle-thumb" />
    </button>
  );
}

/* ── Texts reveal (18-texts-reveal) ───────────────────────────
   Wrap stacked lines; each child becomes a `.t-stagger-line` held back by
   --stagger-stagger per line, and `.is-shown` plays the entrance on mount. */
export function RevealLines({ children, className = '', as: Tag = 'div' }: { children: React.ReactNode; className?: string; as?: React.ElementType }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.remove('is-shown');
    void el.offsetHeight;
    const id = requestAnimationFrame(() => el.classList.add('is-shown'));
    return () => cancelAnimationFrame(id);
  }, []);
  const lines = React.Children.toArray(children).filter(Boolean);
  return (
    <Tag ref={ref} className={`t-stagger ${className}`}>
      {lines.map((child, i) => {
        if (!React.isValidElement<{ className?: string; style?: React.CSSProperties }>(child)) return child;
        return React.cloneElement(child, {
          className: `${child.props.className ?? ''} t-stagger-line t-stagger-line--${i + 1}`.trim(),
          style: { ...child.props.style, transitionDelay: `calc(var(--stagger-stagger) * ${i})` },
        });
      })}
    </Tag>
  );
}

/* ── Icon swap (09-icon-swap) ─────────────────────────────────
   Cross-fade two icons in one slot with blur and scale. */
export function IconSwap({ state, a, b, className = '' }: { state: 'a' | 'b'; a: React.ReactNode; b: React.ReactNode; className?: string }) {
  return (
    <span className={`t-icon-swap ${className}`} data-state={state} aria-hidden>
      <span className="t-icon" data-icon="a">{a}</span>
      <span className="t-icon" data-icon="b">{b}</span>
    </span>
  );
}

/* ── Avatar group hover (11-avatar-group-hover) ───────────────
   Distance-falloff lift with a bouncy spring on return. Spread `root` on
   the group and `item(i)` on each `.t-avatar`. */
export function useAvatarGroup() {
  const rootRef = useRef<HTMLDivElement>(null);
  const setShifts = useCallback((activeIdx: number | null, phase: 'in' | 'out') => {
    if (!rootRef.current) return;
    const lift = cssMs('--avatar-lift', -4);
    const falloff = cssMs('--avatar-falloff', 0.45);
    const scale = cssMs('--avatar-scale', 1.05);
    const tf = phase === 'out'
      ? cssVar('--avatar-ease-out', 'cubic-bezier(0.34, 3.85, 0.64, 1)')
      : cssVar('--avatar-ease-in', 'cubic-bezier(0.22, 1, 0.36, 1)');
    rootRef.current.querySelectorAll<HTMLElement>('.t-avatar').forEach((el, i) => {
      el.style.transitionTimingFunction = tf;
      if (activeIdx == null) {
        el.style.setProperty('--shift', '0px');
        el.style.setProperty('--scale-active', '1');
        return;
      }
      const d = Math.abs(i - activeIdx);
      el.style.setProperty('--shift', (lift * Math.pow(falloff, d)).toFixed(3) + 'px');
      el.style.setProperty('--scale-active', i === activeIdx ? String(scale) : '1');
    });
  }, []);
  return {
    root: { ref: rootRef, onMouseLeave: () => setShifts(null, 'out') },
    item: (i: number) => ({ className: 't-avatar', onMouseEnter: () => setShifts(i, 'in') }),
  };
}

/* ── Error state shake (12-error-state-shake) ─────────────────
   Put `wrap` on the field wrapper (it owns the message) and `input` on the
   bordered element. `showError()` shakes, shows the error and auto-reverts
   after --revert-hold; typing clears it. */
export function useErrorShake() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const clear = useCallback(() => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    wrapRef.current?.classList.remove('is-error');
    inputRef.current?.classList.remove('is-error');
  }, []);
  const showError = useCallback(() => {
    const wrap = wrapRef.current;
    const input = inputRef.current;
    if (!wrap || !input) return;
    wrap.classList.add('is-error');
    input.classList.add('is-error');
    input.classList.remove('is-shaking');
    void input.offsetWidth;
    input.classList.add('is-shaking');
    const shakeMs = cssMs('--shake-dur-a', 80) * 2 + cssMs('--shake-dur-b', 60) * 2;
    window.setTimeout(() => input.classList.remove('is-shaking'), shakeMs + 20);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      timer.current = null;
      wrap.classList.remove('is-error');
      input.classList.remove('is-error');
    }, shakeMs + cssMs('--revert-hold', 3000));
  }, []);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  return { wrapRef, inputRef, showError, clear };
}

/* ── Shimmer text (15-shimmer-text) ───────────────────────────
   Sweeps a highlight band across muted text. Pure CSS. */
export function Shimmer({ children, className = '' }: { children: string; className?: string }) {
  return <span className={`t-shimmer ${className}`} data-text={children}>{children}</span>;
}

/* ── Number pop-in (02-number-pop-in) ─────────────────────────
   Only the digits that changed re-enter with a blurred slide; the last two
   ride in 1× / 2× --digit-stagger behind. */
export function NumberPop({ value, className = '' }: { value: number | string; className?: string }) {
  const str = String(value);
  const prev = useRef<string | null>(null);
  const ref = useRef<HTMLSpanElement>(null);
  const [same, setSame] = useState(str.length);
  useLayoutEffect(() => {
    const before = prev.current;
    prev.current = str;
    if (before === null || before === str) return;
    let n = 0;
    while (n < before.length && n < str.length && before[n] === str[n]) n++;
    setSame(n);
    const el = ref.current;
    if (!el) return;
    el.classList.remove('is-animating');
    void el.offsetHeight;
    el.classList.add('is-animating');
  }, [str]);
  const chars = str.split('');
  return (
    <span ref={ref} className={`t-digit-group ${className}`}>
      {chars.map((ch, i) => (
        <span
          key={`${i}-${ch}`}
          className="t-digit"
          data-same={i < same ? '' : undefined}
          data-stagger={i === chars.length - 2 ? '1' : i === chars.length - 1 ? '2' : undefined}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

/* ── Tabs sliding (16-tabs-sliding) ───────────────────────────
   Measures the active tab and writes its offset / width onto the pill. On
   first paint and resize the pill snaps there without a transition. */
export function useSlidingPill<T extends HTMLElement>(activeKey: unknown, selector = '[aria-selected="true"], .active') {
  const barRef = useRef<T>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const first = useRef(true);
  const move = useCallback((animate: boolean) => {
    const bar = barRef.current;
    const pill = pillRef.current;
    if (!bar || !pill) return;
    const tab = bar.querySelector<HTMLElement>(selector);
    if (!tab) { pill.style.opacity = '0'; return; }
    pill.style.opacity = '1';
    const apply = () => {
      pill.style.transform = `translateX(${tab.offsetLeft}px)`;
      pill.style.width = `${tab.offsetWidth}px`;
    };
    if (!animate) {
      const prevT = pill.style.transition;
      pill.style.transition = 'none';
      apply();
      void pill.offsetWidth;
      pill.style.transition = prevT;
    } else apply();
  }, [selector]);
  useLayoutEffect(() => {
    move(!first.current);
    first.current = false;
  }, [activeKey, move]);
  useEffect(() => {
    const onResize = () => move(false);
    window.addEventListener('resize', onResize);
    const ro = typeof ResizeObserver !== 'undefined' && barRef.current ? new ResizeObserver(onResize) : null;
    if (ro && barRef.current) ro.observe(barRef.current);
    return () => { window.removeEventListener('resize', onResize); ro?.disconnect(); };
  }, [move]);
  const pill = <span ref={pillRef} className="t-tabs-pill" aria-hidden />;
  return { barRef, pill };
}

/* ── Accordion expand (21-accordion) ──────────────────────────
   Grid-rows 0fr ↔ 1fr with no height measuring. */
export function AccordionPanel({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className="t-acc" data-open={String(open)}>
      <div className="t-acc-panel"><div className="t-acc-panel-inner">{children}</div></div>
    </div>
  );
}
export function AccordionChevron({ open, size = 14 }: { open: boolean; size?: number }) {
  return (
    <span className="t-acc" data-open={String(open)} style={{ display: 'inline-flex' }}>
      <span className="t-acc-chevron" aria-hidden>
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6.5L8 10.5L12 6.5" />
        </svg>
      </span>
    </span>
  );
}

/* ── Tooltip open/close (17-tooltip) ──────────────────────────
   One tooltip per group, shared by every trigger; it travels between
   triggers while shown. This variant sits to the side of a vertical rail,
   so the travel runs on Y. */
export function useTooltipGroup(enabled: boolean) {
  const groupRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const hide = useCallback(() => {
    tipRef.current?.setAttribute('data-show', 'false');
    tipRef.current?.setAttribute('aria-hidden', 'true');
  }, []);
  const place = useCallback((trigger: HTMLElement) => {
    const group = groupRef.current, tip = tipRef.current, text = textRef.current;
    if (!enabled || !group || !tip || !text) return;
    const showing = tip.getAttribute('data-show') === 'true';
    text.textContent = trigger.getAttribute('data-tooltip') || '';
    const cs = getComputedStyle(tip);
    const width = Math.ceil(text.scrollWidth + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight));
    const g = group.getBoundingClientRect();
    const r = trigger.getBoundingClientRect();
    const y = r.top - g.top + r.height / 2 - tip.offsetHeight / 2;
    if (!showing) {
      tip.style.transition = 'none';
      tip.style.width = `${width}px`;
      tip.style.setProperty('--tt-y', `${y}px`);
      void tip.offsetWidth;
      tip.style.transition = '';
    } else {
      tip.style.width = `${width}px`;
      tip.style.setProperty('--tt-y', `${y}px`);
    }
    tip.setAttribute('data-show', 'true');
    tip.setAttribute('aria-hidden', 'false');
  }, [enabled]);
  useEffect(() => { if (!enabled) hide(); }, [enabled, hide]);
  const trigger = (label: string) => enabled ? ({
    'data-tooltip': label,
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => place(e.currentTarget),
    onFocus: (e: React.FocusEvent<HTMLElement>) => place(e.currentTarget),
    onBlur: hide,
  }) : {};
  const tip = enabled ? (
    <span ref={tipRef} className="t-tt wp-rail-tt" role="tooltip" aria-hidden="true" data-show="false">
      <span ref={textRef} className="t-tt-text" />
    </span>
  ) : null;
  return { groupRef, groupProps: { onPointerLeave: hide }, trigger, tip };
}

/* ── Text states swap (04-text-states-swap) ───────────────────
   Old text exits up with blur, new text enters from below. */
export function TextSwap({ text, className = '' }: { text: string; className?: string }) {
  const [shown, setShown] = useState(text);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (text === shown) return;
    const el = ref.current;
    if (!el) { setShown(text); return; }
    el.classList.add('is-exit');
    const id = window.setTimeout(() => {
      setShown(text);
      el.classList.remove('is-exit');
      el.classList.add('is-enter-start');
      void el.offsetHeight;
      requestAnimationFrame(() => el.classList.remove('is-enter-start'));
    }, cssMs('--text-swap-dur', 150));
    return () => window.clearTimeout(id);
  }, [text, shown]);
  return <span ref={ref} className={`t-text-swap ${className}`}>{shown}</span>;
}

/* ── Matrix dot loader (31-matrix-loader) ─────────────────────
   Sixteen dots pulsing on a shared cycle; the variant is a delay table. */
const RING = [1, 2, 7, 11, 14, 13, 8, 4];
const INNER = [5, 6, 9, 10];
const TWINKLE = [7, 2, 11, 5, 14, 9, 0, 12, 3, 15, 6, 10, 13, 1, 8, 4];
const CORNERS = [0, 3, 12, 15];
export function MatrixLoader({ variant = 'orbit', rounded = false, className = '' }: { variant?: 'scan' | 'twinkle' | 'orbit' | 'pulse'; rounded?: boolean; className?: string }) {
  const cycle = cssMs('--matrix-cycle', 1200);
  return (
    <div className={`t-matrix ${className}`} data-variant={variant} data-rounded={String(rounded)} role="status" aria-label="Loading">
      {Array.from({ length: 16 }, (_, idx) => {
        const col = idx % 4;
        if (rounded && CORNERS.includes(idx)) return <i key={idx} className="is-gap" />;
        let style: React.CSSProperties | undefined;
        if (variant === 'scan') style = { ['--d' as string]: Math.round(col * (cycle / 10)) };
        else if (variant === 'twinkle') style = { ['--d' as string]: Math.round(TWINKLE[idx] * (cycle / 16)) };
        else if (variant === 'orbit') {
          const k = RING.indexOf(idx);
          style = k !== -1 ? { ['--d' as string]: Math.round(k * (cycle / 8)) } : { animation: 'none' };
        } else style = { ['--d' as string]: Math.round((INNER.includes(idx) ? 0 : 1) * (cycle * 0.16)) };
        return <i key={idx} style={style} />;
      })}
    </div>
  );
}

/* ── Success check (10-success-check) ─────────────────────────
   Fade + rotate + Y-bob + stroke-draw on appear. */
export function SuccessCheck({ size = 18 }: { size?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  useLayoutEffect(() => {
    const el = ref.current, path = pathRef.current;
    if (!el || !path) return;
    const len = Math.ceil(path.getTotalLength()) + 1;
    path.style.strokeDasharray = String(len);
    path.style.strokeDashoffset = String(len);
    el.setAttribute('data-state', 'out');
    void el.offsetWidth;
    el.setAttribute('data-state', 'in');
  }, []);
  return (
    <span ref={ref} className="t-success-check" data-state="out" aria-hidden>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path ref={pathRef} d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}
