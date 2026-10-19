import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, Plus, X, User, Sun, Moon, LogOut, KanbanSquare, Milestone } from './ui/icons';
import {
  House, CheckSquareOffset, Folders, Path, CalendarBlank, Tray, GearSix, Users, SidebarSimple,
  type Icon as PhosphorIcon,
} from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkStore } from '../store/useWorkStore';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { avatarInitials } from '../utils';
import { useWorkspace, type AppPage } from '../lib/workspace';
import AvatarBorder from './ui/AvatarBorder';
import wordmarkLight from '../assets/wordmark-light.png';
import wordmarkDark from '../assets/wordmark-dark.png';
import markDark from '../assets/logo-mark-dark.png';
import markLight from '../assets/logo-mark-light.png';

type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'email' | 'privacy' | 'labels';

interface Props {
  page: AppPage;
  onNavigate: (page: AppPage) => void;
  onSelectBoard: (boardId: string) => void;
  onCreateBoard: () => void;
  onCreateRoadmap: () => void;
  onManageMembers: () => void;
  onOpenSettings: (tab?: SettingsTab) => void;
  inboxUnread: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

// Phosphor icons label every destination; the collapsed rail shows the icons alone.
const NAV: Array<{ page: AppPage; label: string; icon: PhosphorIcon }> = [
  { page: 'dashboard', label: 'Today', icon: House },
  { page: 'mywork', label: 'My Work', icon: CheckSquareOffset },
  { page: 'projects', label: 'Projects', icon: Folders },
  { page: 'timeline', label: 'Timeline', icon: Path },
  { page: 'calendar', label: 'Calendar', icon: CalendarBlank },
  { page: 'inbox', label: 'Inbox', icon: Tray },
];

export default function Sidebar({
  page,
  onNavigate,
  onSelectBoard,
  onCreateBoard,
  onCreateRoadmap,
  onManageMembers,
  onOpenSettings,
  inboxUnread,
  collapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
}: Props) {
  const activeBoardId = useWorkStore(s => s.activeBoardId);
  const logout = useAuthStore(s => s.logout);
  const isDark = useThemeStore(s => s.isDark);
  const toggleTheme = useThemeStore(s => s.toggle);
  const { user, boards } = useWorkspace();

  const [createOpen, setCreateOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const inProject = page === 'board' || page === 'roadmap';
  const activeBoard = inProject ? boards.find(b => b.id === activeBoardId) : undefined;

  useEffect(() => {
    if (!createOpen && !userMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (createOpen && !createRef.current?.contains(e.target as Node)) setCreateOpen(false);
      if (userMenuOpen && !userRef.current?.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [createOpen, userMenuOpen]);

  const close = () => onCloseMobile?.();
  const go = (p: AppPage) => { onNavigate(p); close(); };
  const isNavActive = (p: AppPage) => page === p || (p === 'projects' && inProject);
  const isCollapsed = collapsed && !isMobileOpen;

  const avatar = (size: number) => (
    <AvatarBorder borderStyle={user?.borderStyle} size={size}>
      {user?.avatarUrl ? (
        <img src={user.avatarUrl} alt={user?.name || 'User'} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div className="wp-avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.38 }}>
          {avatarInitials(user?.name || 'U')}
        </div>
      )}
    </AvatarBorder>
  );

  return (
    <aside className={`sidebar wp-sidebar${isCollapsed ? ' collapsed' : ''}${isMobileOpen ? ' mobile-open' : ''}`}>
      {/* Brand lockup */}
      <div className="wp-sidebar-brand">
        {isCollapsed ? (
          // The rail is too narrow for a logo and a separate toggle side by side, so the
          // mark itself is the expand control: it swaps to a sidebar icon on hover.
          <button type="button" className="wp-brand-btn wp-rail-toggle" onClick={onToggleCollapse} title="Expand sidebar" aria-label="Expand sidebar">
            <img src={isDark ? markDark : markLight} alt="" className="wp-brand-mark" />
            <SidebarSimple size={20} className="wp-rail-toggle-icon" />
          </button>
        ) : (
          <button type="button" className="wp-brand-btn" onClick={() => go('dashboard')} title="Waypoint — Today">
            <span className="wp-brand-lockup">
              <img src={isDark ? wordmarkDark : wordmarkLight} alt="Waypoint" className="wp-brand-wordmark" />
              <span className="wp-brand-sub">By Next Technology</span>
            </span>
          </button>
        )}
        {isCollapsed ? null : onCloseMobile && isMobileOpen ? (
          <button type="button" className="wp-icon-ghost" onClick={close} aria-label="Close navigation">
            <X size={18} />
          </button>
        ) : (
          <button
            type="button"
            className="wp-icon-btn wp-collapse-btn hide-on-mobile"
            onClick={onToggleCollapse}
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <SidebarSimple size={18} />
          </button>
        )}
      </div>

      <div className="wp-sidebar-scroll">
        {/* Primary navigation */}
        <nav className="wp-nav" aria-label="Primary">
          {NAV.map(({ page: p, label, icon: NavIcon }) => (
            <button
              key={p}
              type="button"
              className={`wp-nav-item${isNavActive(p) ? ' active' : ''}`}
              onClick={() => go(p)}
              title={isCollapsed ? label : undefined}
            >
              <NavIcon size={isCollapsed ? 21 : 19} weight={isNavActive(p) ? 'fill' : 'regular'} aria-hidden />
              {!isCollapsed && <span className="wp-nav-label">{label}</span>}
              {p === 'inbox' && inboxUnread && <span className="wp-nav-dot" aria-label="Unread" />}
            </button>
          ))}
        </nav>

        {/* Projects quick list */}
        {!isCollapsed && (
          <div className="wp-side-section">
            <div className="wp-side-section-head">
              <span className="wp-eyebrow">Projects</span>
              <div ref={createRef} style={{ position: 'relative' }}>
                <button type="button" className="wp-text-link" onClick={() => setCreateOpen(o => !o)} title="New project">
                  <Plus size={12} weight="bold" /> New
                </button>
                <AnimatePresence>
                  {createOpen && (
                    <motion.div
                      className="wp-menu"
                      style={{ right: 0, top: 30, width: 200 }}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                    >
                      <button type="button" className="wp-menu-item" onClick={() => { setCreateOpen(false); onCreateBoard(); close(); }}>
                        <KanbanSquare size={16} /> New task board
                      </button>
                      <button type="button" className="wp-menu-item" onClick={() => { setCreateOpen(false); onCreateRoadmap(); close(); }}>
                        <Milestone size={16} /> New roadmap
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="wp-project-list">
              {boards.length === 0 && <div className="wp-side-empty">No projects yet</div>}
              {boards.map(b => (
                <button
                  key={b.id}
                  type="button"
                  className={`wp-project-link${inProject && b.id === activeBoardId ? ' active' : ''}`}
                  onClick={() => { onSelectBoard(b.id); close(); }}
                  title={b.name}
                >
                  {b.type === 'roadmap' ? <Milestone size={15} className="wp-project-icon" /> : <KanbanSquare size={15} className="wp-project-icon" />}
                  <span className="wp-project-name">{b.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="wp-sidebar-foot">
        {activeBoard && (
          <button type="button" className="wp-foot-link" onClick={() => { onManageMembers(); close(); }} title="Team">
            <Users size={isCollapsed ? 20 : 18} aria-hidden />
            {!isCollapsed && (
              <>
                <span style={{ flex: 1, textAlign: 'left' }}>Team</span>
                <span className="wp-foot-meta">{activeBoard.members?.length || 0}</span>
                <ChevronRight size={14} className="wp-foot-chevron" />
              </>
            )}
          </button>
        )}

        <div ref={userRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className={`wp-workspace-card${isCollapsed ? ' compact' : ''}`}
            onClick={() => setUserMenuOpen(o => !o)}
            title={user?.name || 'Account'}
          >
            {avatar(26)}
            {!isCollapsed && (
              <>
                <span className="wp-workspace-text">
                  <span className="wp-workspace-name">{user?.name || 'Your account'}</span>
                  <span className="wp-workspace-sub">{user?.email}</span>
                </span>
                <ChevronRight size={14} className="wp-foot-chevron" />
              </>
            )}
          </button>
          <AnimatePresence>
            {userMenuOpen && (
              <motion.div
                className="wp-menu"
                style={{ left: 0, bottom: 'calc(100% + 8px)', width: 232 }}
                initial={{ opacity: 0, y: 6, scale: 0.96, filter: 'blur(3px)' }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: 4, scale: 0.96, filter: 'blur(2px)' }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <button type="button" className="wp-menu-item" onClick={() => { setUserMenuOpen(false); onOpenSettings('profile'); close(); }}>
                  <User size={16} /> Profile & avatar
                </button>
                <button type="button" className="wp-menu-item" onClick={() => toggleTheme()}>
                  {isDark ? <Sun size={16} /> : <Moon size={16} />} {isDark ? 'Switch to light' : 'Switch to dark'}
                </button>
                <div className="wp-menu-sep" />
                <button type="button" className="wp-menu-item danger" onClick={() => { setUserMenuOpen(false); logout(); }}>
                  <LogOut size={16} /> Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="wp-foot-row">
          <button type="button" className="wp-foot-link" onClick={() => { onOpenSettings(); close(); }} title="Settings">
            <GearSix size={isCollapsed ? 20 : 18} aria-hidden />
            {!isCollapsed && <span style={{ flex: 1, textAlign: 'left' }}>Settings</span>}
          </button>
          {!isCollapsed && (
            <button
              type="button"
              className="wp-text-link"
              onClick={() => toggleTheme()}
              title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            >
              {isDark ? <Moon size={14} /> : <Sun size={14} />}
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
