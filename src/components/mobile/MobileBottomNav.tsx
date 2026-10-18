import React from 'react';
import { motion } from 'framer-motion';
import type { AppPage } from '../../lib/workspace';

interface MobileBottomNavProps {
  page: AppPage;
  inboxUnread: boolean;
  onNavigate: (page: AppPage) => void;
  onNewTask: () => void;
}

export default function MobileBottomNav({ page, inboxUnread, onNavigate, onNewTask }: MobileBottomNavProps) {
  const tab = (p: AppPage, label: string, active = page === p, dot = false) => (
    <button type="button" className={`mobile-nav-tab${active ? ' active' : ''}`} onClick={() => onNavigate(p)}>
      <span className="wp-mobile-tab-label">
        {label}
        {dot && <span className="wp-nav-dot mobile" />}
      </span>
    </button>
  );

  return (
    <nav className="mobile-bottom-nav" aria-label="Primary">
      {tab('dashboard', 'Today')}
      {tab('mywork', 'Work')}
      <div className="mobile-nav-fab-wrapper">
        <motion.button whileTap={{ scale: 0.94 }} type="button" className="mobile-nav-fab" onClick={onNewTask} aria-label="New task">
          +
        </motion.button>
      </div>
      {tab('projects', 'Projects', page === 'projects' || page === 'board' || page === 'roadmap')}
      {tab('inbox', 'Inbox', page === 'inbox', inboxUnread)}
    </nav>
  );
}
