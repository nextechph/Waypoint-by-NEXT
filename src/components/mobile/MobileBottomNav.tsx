import React from 'react';
import { motion } from 'framer-motion';
import type { AppPage } from '../../lib/workspace';
import { Home, CheckSquare, FolderClosed, Inbox, Plus } from '../ui/icons';

type IconC = typeof Home;

interface MobileBottomNavProps {
  page: AppPage;
  inboxUnread: boolean;
  onNavigate: (page: AppPage) => void;
  onNewTask: () => void;
}

export default function MobileBottomNav({ page, inboxUnread, onNavigate, onNewTask }: MobileBottomNavProps) {
  const tab = (p: AppPage, label: string, Icon: IconC, active = page === p, dot = false) => (
    <button type="button" className={`mobile-nav-tab${active ? ' active' : ''}`} onClick={() => onNavigate(p)}>
      <span className="wp-mobile-tab-icon">
        <Icon size={22} weight={active ? 'fill' : 'regular'} />
        {dot && <span className="wp-nav-dot mobile" />}
      </span>
      <span className="wp-mobile-tab-label">{label}</span>
    </button>
  );

  return (
    <nav className="mobile-bottom-nav" aria-label="Primary">
      {tab('dashboard', 'Today', Home)}
      {tab('mywork', 'Work', CheckSquare)}
      <div className="mobile-nav-fab-wrapper">
        <motion.button whileTap={{ scale: 0.94 }} type="button" className="mobile-nav-fab" onClick={onNewTask} aria-label="New task">
          <Plus size={22} weight="bold" />
        </motion.button>
      </div>
      {tab('projects', 'Projects', FolderClosed, page === 'projects' || page === 'board' || page === 'roadmap')}
      {tab('inbox', 'Inbox', Inbox, page === 'inbox', inboxUnread)}
    </nav>
  );
}
