import React from 'react';
import { motion } from 'framer-motion';
import type { AppPage } from '../../lib/workspace';
import { Home, CheckSquare, FolderClosed, Inbox, Plus } from '../ui/icons';

interface MobileBottomNavProps {
  page: AppPage;
  inboxUnread: boolean;
  onNavigate: (page: AppPage) => void;
  onNewTask: () => void;
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
 * slides along the route and reveals its label. New task sits apart as its own button.
 */
export default function MobileBottomNav({ page, inboxUnread, onNavigate, onNewTask }: MobileBottomNavProps) {
  const activeIndex = STOPS.findIndex(s =>
    s.page === page || (s.page === 'projects' && (page === 'board' || page === 'roadmap')),
  );

  return (
    <div className="wp-route-dock">
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
        whileTap={{ scale: 0.92, rotate: 90 }}
        type="button"
        className="wp-route-new"
        onClick={onNewTask}
        aria-label="New task"
      >
        <Plus size={22} weight="bold" />
      </motion.button>
    </div>
  );
}
