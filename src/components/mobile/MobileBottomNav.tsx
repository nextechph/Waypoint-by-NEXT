import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AppPage } from '../../lib/workspace';
import { Home, CheckSquare, FolderClosed, Inbox, Plus, KanbanSquare, Milestone } from '../ui/icons';

interface MobileBottomNavProps {
  page: AppPage;
  inboxUnread: boolean;
  onNavigate: (page: AppPage) => void;
  onCreateBoard: () => void;
  onCreateRoadmap: () => void;
}

const STOPS: Array<{ page: AppPage; label: string; icon: typeof Home }> = [
  { page: 'dashboard', label: 'Today', icon: Home },
  { page: 'mywork', label: 'Work', icon: CheckSquare },
  { page: 'projects', label: 'Projects', icon: FolderClosed },
  { page: 'inbox', label: 'Inbox', icon: Inbox },
];

const spring = { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.8 };

/**
 * The "route bar": a floating capsule with a dotted route running through it. Each
 * destination is a stop on that route; the current one becomes an inverted marker that
 * slides along the route and reveals its label. The plus button beside it opens a choice
 * between a new task board and a new roadmap.
 */
export default function MobileBottomNav({ page, inboxUnread, onNavigate, onCreateBoard, onCreateRoadmap }: MobileBottomNavProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!createOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!dockRef.current?.contains(e.target as Node)) setCreateOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setCreateOpen(false); };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [createOpen]);

  const pick = (fn: () => void) => () => { setCreateOpen(false); fn(); };

  const activeIndex = STOPS.findIndex(s =>
    s.page === page || (s.page === 'projects' && (page === 'board' || page === 'roadmap')),
  );

  return (
    <div className={`wp-route-dock${createOpen ? ' creating' : ''}`} ref={dockRef}>
      <AnimatePresence>
        {createOpen && (
          <motion.div
            className="wp-route-create"
            role="menu"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
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
      </AnimatePresence>
      <nav className="wp-route" aria-label="Primary">
        <span className="wp-route-line" aria-hidden />
        {STOPS.map(({ page: p, label, icon: Icon }, i) => {
          const active = i === activeIndex;
          return (
            <button
              key={p}
              type="button"
              className={`wp-route-stop${active ? ' active' : ''}${i < activeIndex ? ' passed' : ''}`}
              onClick={() => onNavigate(p)}
              aria-current={active ? 'page' : undefined}
              aria-label={label}
            >
              {active && <motion.span layoutId="wp-route-marker" className="wp-route-marker" transition={spring} />}
              <span className="wp-route-stop-inner">
                <span className="wp-route-icon">
                  <Icon size={20} weight={active ? 'fill' : 'regular'} />
                  {p === 'inbox' && inboxUnread && !active && <span className="wp-route-dot" />}
                </span>
                {active && (
                  <motion.span
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
        onClick={() => setCreateOpen(o => !o)}
        aria-label={createOpen ? 'Close create menu' : 'Create board or roadmap'}
        aria-haspopup="menu"
        aria-expanded={createOpen}
      >
        <motion.span
          style={{ display: 'inline-flex' }}
          animate={{ rotate: createOpen ? 45 : 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 26 }}
        >
          <Plus size={22} weight="bold" />
        </motion.span>
      </motion.button>
    </div>
  );
}
