import React, { useEffect, useRef, useState } from 'react';
import { Bell, Search, ChevronDown, Menu, LogOut, User, Sun, Moon, Settings } from './ui/glyphs';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkStore } from '../store/useWorkStore';
import { useAuthStore } from '../store/useAuthStore';
import { useThemeStore } from '../store/useThemeStore';
import { avatarInitials, useIsMobile } from '../utils';
import { useMyNotifications, type AppPage } from '../lib/workspace';
import AvatarBorder from './ui/AvatarBorder';
import markDark from '../assets/logo-mark-dark.png';
import markLight from '../assets/logo-mark-light.png';

type SettingsTab = 'profile' | 'appearance' | 'notifications' | 'email' | 'privacy' | 'labels';

interface Props {
  page: AppPage;
  onNavigate: (page: AppPage) => void;
  onOpenSearch: () => void;
  onOpenSettings: (tab?: SettingsTab) => void;
  onToggleNotif: () => void;
  notifOpen: boolean;
  onToggleMobileMenu?: () => void;
}

const PAGE_LABEL: Partial<Record<AppPage, string>> = {
  mywork: 'My Work',
  projects: 'Projects',
  timeline: 'Timeline',
  calendar: 'Calendar',
  inbox: 'Inbox',
};

export default function Topbar({
  page,
  onNavigate,
  onOpenSearch,
  onOpenSettings,
  onToggleNotif,
  notifOpen,
  onToggleMobileMenu,
}: Props) {
  const boards = useWorkStore(s => s.boards);
  const activeBoardId = useWorkStore(s => s.activeBoardId);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const isDark = useThemeStore(s => s.isDark);
  const toggleTheme = useThemeStore(s => s.toggle);
  const notifications = useMyNotifications();
  const isMobile = useIsMobile(860);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const inProject = page === 'board' || page === 'roadmap';
  const board = inProject ? boards.find(b => b.id === activeBoardId) : undefined;
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  const rootLabel = inProject ? 'Projects' : 'Workspace';
  const leafLabel = inProject ? board?.name ?? 'Project' : page === 'dashboard' ? today : PAGE_LABEL[page] ?? '';

  return (
    <header className="topbar wp-topbar">
      <div className="wp-topbar-left">
        {onToggleMobileMenu && (
          <button type="button" className="wp-text-link show-on-mobile-flex" onClick={onToggleMobileMenu} aria-label="Open navigation">
            Menu
          </button>
        )}
        {isMobile && (
          <img src={isDark ? markDark : markLight} alt="Waypoint" className="wp-topbar-mark" onClick={() => onNavigate('dashboard')} />
        )}
        <nav className="wp-crumbs" aria-label="Breadcrumb">
          {!isMobile && (
            <>
              <button type="button" className="wp-crumb" onClick={() => onNavigate(inProject ? 'projects' : 'dashboard')}>
                {rootLabel}
              </button>
              <span className="wp-crumb-sep">/</span>
            </>
          )}
          <span className="wp-crumb current">{leafLabel}</span>
        </nav>
      </div>

      <div className="wp-topbar-right">
        <button type="button" className="wp-search-trigger" onClick={onOpenSearch} title="Search (⌘K)">
          {isMobile ? <span className="wp-search-word">Search</span> : (
            <>
              <span className="wp-search-placeholder">{board ? `Search ${board.name}…` : 'Search anything…'}</span>
              <kbd className="wp-kbd">⌘K</kbd>
            </>
          )}
        </button>

        <span className="wp-topbar-divider hide-on-mobile" />

        <div ref={menuRef} style={{ position: 'relative' }}>
          <button type="button" className="wp-user-trigger" onClick={() => setMenuOpen(o => !o)} title={user?.name || 'Account'}>
            <AvatarBorder borderStyle={user?.borderStyle} size={32}>
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user?.name || 'User'} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div className="wp-avatar-fallback" style={{ width: 32, height: 32, fontSize: 12 }}>
                  {avatarInitials(user?.name || 'U')}
                </div>
              )}
            </AvatarBorder>
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                className="wp-menu"
                style={{ right: 0, top: 'calc(100% + 10px)', width: 248 }}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
              >
                <div className="wp-menu-head">
                  <div className="wp-menu-name">{user?.name || 'User'}</div>
                  {user?.email && <div className="wp-menu-email">{user.email}</div>}
                </div>
                <div className="wp-menu-sep" />
                <button type="button" className="wp-menu-item" onClick={() => { setMenuOpen(false); onOpenSettings('profile'); }}>
                  Profile & avatar
                </button>
                <button type="button" className="wp-menu-item" onClick={() => { setMenuOpen(false); onOpenSettings(); }}>
                  Settings
                </button>
                <button type="button" className="wp-menu-item" onClick={() => toggleTheme()}>
                  {isDark ? 'Switch to light' : 'Switch to dark'}
                </button>
                <div className="wp-menu-sep" />
                <button type="button" className="wp-menu-item danger" onClick={() => { setMenuOpen(false); logout(); }}>
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
