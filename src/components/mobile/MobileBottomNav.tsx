import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppPage } from '../../lib/workspace';
import { Home, CheckSquare, FolderClosed, Inbox, Plus, KanbanSquare, Milestone, Path, Calendar } from '../ui/icons';

interface MobileBottomNavProps {
  page: AppPage;
  inboxUnread: boolean;
  onNavigate: (page: AppPage) => void;
  onCreateBoard: () => void;
  onCreateRoadmap: () => void;
}

type IconC = typeof Home;
type Menu = 'create' | 'plan' | null;

interface Stop {
  key: string;
  label: string;
  icon: IconC;
  /** Pages that light this stop up. */
  pages: AppPage[];
}

// Timeline and Calendar share one "Plan" stop so the bar keeps five roomy stops.
const STOPS: Stop[] = [
  { key: 'dashboard', label: 'Today', icon: Home, pages: ['dashboard'] },
  { key: 'mywork', label: 'Work', icon: CheckSquare, pages: ['mywork'] },
  { key: 'projects', label: 'Projects', icon: FolderClosed, pages: ['projects', 'board', 'roadmap'] },
  { key: 'plan', label: 'Plan', icon: Path, pages: ['timeline', 'calendar'] },
  { key: 'inbox', label: 'Inbox', icon: Inbox, pages: ['inbox'] },
];

const spring = { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.8 };
const pop = {
  initial: { opacity: 0, y: 12, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.97 },
  transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
};

/**
 * The "route bar": a floating capsule with a dotted route running through it. Each
 * destination is a stop on that route; the current one becomes an inverted marker that
 * slides along the route and reveals its label. The Plan stop opens a Timeline / Calendar
 * choice, and the plus button beside the bar opens a choice of task board or roadmap.
 */
export default function MobileBottomNav({ page, inboxUnread, onNavigate, onCreateBoard, onCreateRoadmap }: MobileBottomNavProps) {
  const [menu, setMenu] = useState<Menu>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (!dockRef.current?.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  // Close any open menu when the page changes.
  useEffect(() => { setMenu(null); }, [page]);

  const pick = (fn: () => void) => () => { setMenu(null); fn(); };
  const toggle = (m: Exclude<Menu, null>) => setMenu(cur => (cur === m ? null : m));

  const activeIndex = STOPS.findIndex(s => s.pages.includes(page));
  const stopLabel = (s: Stop) => (s.key === 'plan' && page === 'calendar' ? 'Calendar' : s.key === 'plan' && page === 'timeline' ? 'Timeline' : s.label);

  return (
    <div className={`wp-route-dock${menu === 'create' ? ' creating' : ''}`} ref={dockRef}>
      <AnimatePresence>
        {menu === 'create' && (
          <motion.div key="create" className="wp-route-create" role="menu" {...pop}>
            <span className="wp-route-create-eyebrow">Create new</span>
            <button type="button" role="menuitem" className="wp-route-create-item" onClick={pick(onCreateBoard)}>
              <span className="wp-route-create-icon"><KanbanSquare size={20} /></span>
              <span className="wp-route-create-text">
                <strong>Task board</strong>
                <small>Kanban columns for day-to-day work</small>
              </span>
            </button>
            <button type="button" role="menuitem" className="wp-route-create-item" onClick={pick(onCreateRoadmap)}>
              <span className="wp-route-create-icon"><Milestone size={20} /></span>
              <span className="wp-route-create-text">
                <strong>Roadmap</strong>
                <small>Phases and a timeline for the bigger plan</small>
              </span>
            </button>
          </motion.div>
        )}
        {menu === 'plan' && (
          <motion.div key="plan" className="wp-route-create plan" role="menu" {...pop}>
            <span className="wp-route-create-eyebrow">Plan</span>
            <button
              type="button"
              role="menuitem"
              className={`wp-route-create-item${page === 'timeline' ? ' current' : ''}`}
              onClick={pick(() => onNavigate('timeline'))}
            >
              <span className="wp-route-create-icon"><Path size={20} /></span>
              <span className="wp-route-create-text">
                <strong>Timeline</strong>
                <small>Every project across the weeks ahead</small>
              </span>
            </button>
            <button
              type="button"
              role="menuitem"
              className={`wp-route-create-item${page === 'calendar' ? ' current' : ''}`}
              onClick={pick(() => onNavigate('calendar'))}
            >
              <span className="wp-route-create-icon"><Calendar size={20} /></span>
              <span className="wp-route-create-text">
                <strong>Calendar</strong>
                <small>Deadlines and milestones by day</small>
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <nav className="wp-route" aria-label="Primary">
        <span className="wp-route-line" aria-hidden />
        {STOPS.map((stop, i) => {
          const { key, icon: Icon } = stop;
          const label = stopLabel(stop);
          const active = i === activeIndex;
          const isPlan = key === 'plan';
          return (
            <button
              key={key}
              type="button"
              className={`wp-route-stop${active ? ' active' : ''}${i < activeIndex ? ' passed' : ''}${isPlan && menu === 'plan' ? ' open' : ''}`}
              onClick={() => (isPlan ? toggle('plan') : onNavigate(stop.pages[0]))}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
              aria-haspopup={isPlan ? 'menu' : undefined}
              aria-expanded={isPlan ? menu === 'plan' : undefined}
            >
              {active && <motion.span layoutId="wp-route-marker" className="wp-route-marker" transition={spring} />}
              <span className="wp-route-stop-inner">
                <span className="wp-route-icon">
                  <Icon size={20} weight={active ? 'fill' : 'regular'} />
                  {key === 'inbox' && inboxUnread && !active && <span className="wp-route-dot" />}
                </span>
                {active && (
                  <motion.span
                    key={label}
                    className="wp-route-label"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {label}
                  </motion.span>
                )}
              </span>
            </button>
          );
        })}
      </nav>
      <motion.button
        whileTap={{ scale: 0.92 }}
        type="button"
        className="wp-route-new"
        onClick={() => toggle('create')}
        aria-label={menu === 'create' ? 'Close create menu' : 'Create board or roadmap'}
        aria-haspopup="menu"
        aria-expanded={menu === 'create'}
      >
        <motion.span
          style={{ display: 'inline-flex' }}
          animate={{ rotate: menu === 'create' ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
        >
          <Plus size={22} weight="bold" />
        </motion.span>
      </motion.button>
    </div>
  );
}
