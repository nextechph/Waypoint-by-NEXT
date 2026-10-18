import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import BoardArea from './components/BoardArea';
import CardModal from './components/CardModal';
import MembersModal from './components/MembersModal';
import EmailNotifModal from './components/EmailNotifModal';
import LoginPage from './components/LoginPage';
import NotifPanel from './components/NotifPanel';
import Toast from './components/Toast';
import TodayPage from './components/pages/TodayPage';
import MyWorkPage from './components/pages/MyWorkPage';
import ProjectsPage from './components/pages/ProjectsPage';
import TimelinePage from './components/pages/TimelinePage';
import InboxPage from './components/pages/InboxPage';
import ProjectHeader from './components/ProjectHeader';
import QuickTaskModal from './components/modals/QuickTaskModal';
import CreateBoardModal from './components/modals/CreateBoardModal';
import CreateRoadmapModal from './components/modals/CreateRoadmapModal';
import AddColumnModal from './components/modals/AddColumnModal';
import SearchModal from './components/modals/SearchModal';
import PrivacyModal from './components/modals/PrivacyModal';
import SettingsModal from './components/modals/SettingsModal';
import ConfirmModal from './components/modals/ConfirmModal';
import { InboxDrawer } from './components/InboxDrawer';
import InviteLandingPage from './components/InviteLandingPage';
import AppLoadingScreen from './components/AppLoadingScreen';
import { MobileBottomNav, MobileBoardSelector } from './components/mobile';
import { useWorkStore } from './store/useWorkStore';
import { useNotifStore } from './store/useNotifStore';
import { useEmailStore } from './store/useEmailStore';
import { useAuthStore } from './store/useAuthStore';
import { useThemeStore } from './store/useThemeStore';
import { useToastStore } from './store/useToastStore';
import { useSettingsStore } from './store/useSettingsStore';
import { supabaseService } from './services/supabaseService';
import { formatDueDate, uid, useIsMobile } from './utils';
import type { MemberRole } from './types';
import { SHELL_PAGES, getInboxSeen, markInboxSeen, useMyNotifications, type AppPage } from './lib/workspace';

const CHECK_INTERVAL_MS = 10_000;

const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.26, ease: [0.25, 1, 0.5, 1] } },
  exit: { opacity: 0, transition: { duration: 0.12 } }
};

const pageMobileVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.15 } }
};

export default function App() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const initializeAuth = useAuthStore(s => s.initializeAuth);
  const boards = useWorkStore(s => s.boards);
  const getVisibleBoards = useWorkStore(s => s.getVisibleBoards);
  const activeBoardId = useWorkStore(s => s.activeBoardId);
  const currentUser = useAuthStore(s => s.user);
  const visibleBoards = useMemo(() => getVisibleBoards(currentUser?.email), [getVisibleBoards, currentUser?.email, boards]);
  const currentBoard = useMemo(() => visibleBoards.find(b => b.id === activeBoardId) || visibleBoards[0] || null, [visibleBoards, activeBoardId]);
  const switchBoard = useWorkStore(s => s.switchBoard);
  const updateCard = useWorkStore(s => s.updateCard);
  const syncCurrentUserProfile = useWorkStore(s => s.syncCurrentUserProfile);
  const loadBoardsFromCloud = useWorkStore(s => s.loadBoardsFromCloud);
  const isLoadingCloud = useWorkStore(s => s.isLoadingCloud);
  const hasLoadedOnce = useWorkStore(s => s.hasLoadedOnce);
  const loadNotificationsFromCloud = useNotifStore(s => s.loadNotificationsFromCloud);
  const addNotification = useNotifStore(s => s.addNotification);
  const showToast = useToastStore(s => s.showToast);
  const isDark = useThemeStore(s => s.isDark);

  // Track whether auth has been resolved (prevents login-page flash on reload)
  const [authInitialized, setAuthInitialized] = useState(false);

  // Initialize Supabase Auth session & listener on mount with safety timeout
  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      if (mounted) setAuthInitialized(true);
    }, 2000);

    initializeAuth().finally(() => {
      if (mounted) setAuthInitialized(true);
      clearTimeout(timer);
    });

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [initializeAuth]);

  // Safety fallback: Never keep the user on the global loading screen for more than 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setAuthInitialized(true);
      useWorkStore.setState({ hasLoadedOnce: true });
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Pending invite link state
  const [pendingInvite, setPendingInvite] = useState<{ boardId: string; role: MemberRole } | null>(null);

  // Check URL or session for board invite link (?joinBoard=... or ?invite=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinBoardId = params.get('joinBoard') || params.get('invite');
    const inviteRole = (params.get('role') as MemberRole) || 'member';

    if (joinBoardId) {
      const inviteObj = { boardId: joinBoardId, role: inviteRole };
      setPendingInvite(inviteObj);
      try {
        localStorage.setItem('waypoint_pending_invite', JSON.stringify(inviteObj));
        sessionStorage.setItem('waypoint_pending_invite', JSON.stringify(inviteObj));
      } catch {}
    } else {
      try {
        const saved = localStorage.getItem('waypoint_pending_invite') || sessionStorage.getItem('waypoint_pending_invite');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.boardId) {
            setPendingInvite(parsed);
          }
        }
      } catch {}
    }
  }, []);

  // Intercept and handle OAuth redirect errors (e.g. bad_oauth_state after session clear)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const errorDesc = searchParams.get('error_description') || hashParams.get('error_description') || searchParams.get('error') || hashParams.get('error');
      const errorCode = searchParams.get('error_code') || hashParams.get('error_code');

      if (errorDesc) {
        console.error('[Supabase Auth] OAuth redirect error in URL:', {
          errorCode,
          errorDesc,
          search: window.location.search,
          hash: window.location.hash
        });
        // Clean URL to prevent infinite error loops on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
        useToastStore.getState().showToast(
          errorDesc.includes('bad_oauth_state') || errorDesc.includes('expired')
            ? 'Google Sign In failed (bad_oauth_state). An ad-blocker may be blocking cookies, or check Supabase Redirect URLs.'
            : decodeURIComponent(errorDesc.replace(/\+/g, ' ')),
          'warning',
          7000
        );
      }
    } catch {}
  }, []);

  // Load cloud boards, notifications & custom labels when user is logged in
  useEffect(() => {
    if (currentUser?.email) {
      const email = currentUser.email.toLowerCase().trim();
      loadBoardsFromCloud(email);
      loadNotificationsFromCloud(email);
      useSettingsStore.getState().loadCustomLabelsFromCloud(email);
    }
  }, [currentUser?.email, loadBoardsFromCloud, loadNotificationsFromCloud]);

  // Realtime subscription: auto-refresh boards & notifications when changes happen on Supabase
  useEffect(() => {
    if (!currentUser?.email) return;
    const email = currentUser.email;

    let boardsDebounceTimer: number | undefined;

    const unsub = supabaseService.subscribeToAll(
      email,
      () => {
        if (boardsDebounceTimer) clearTimeout(boardsDebounceTimer);
        boardsDebounceTimer = window.setTimeout(() => {
          loadBoardsFromCloud(email);
        }, 350);
      },
      () => {
        loadNotificationsFromCloud(email);
      },
      () => {
        useSettingsStore.getState().loadCustomLabelsFromCloud(email);
      }
    );

    // Fast sync on tab focus or visibility change
    const handleFocusSync = () => {
      loadBoardsFromCloud(email);
      loadNotificationsFromCloud(email);
    };

    window.addEventListener('focus', handleFocusSync);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') handleFocusSync();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Periodic safety sync (every 4 seconds) to guarantee 100% realtime sync across devices
    const pollInterval = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadBoardsFromCloud(email);
        loadNotificationsFromCloud(email);
      }
    }, 4000);

    return () => {
      if (boardsDebounceTimer) clearTimeout(boardsDebounceTimer);
      clearInterval(pollInterval);
      unsub();
      window.removeEventListener('focus', handleFocusSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser?.email, loadBoardsFromCloud, loadNotificationsFromCloud]);

  // Sync user profile name with board memberships
  useEffect(() => {
    if (currentUser?.email && currentUser?.name) {
      syncCurrentUserProfile(currentUser);
    }
  }, [currentUser, syncCurrentUserProfile]);

  // Apply / remove dark class on <html>
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Helper to read initial navigation state on load/refresh
  const getInitialRouting = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlPage = params.get('page');
      const urlBoard = params.get('board') || params.get('b');
      const savedBoard = localStorage.getItem('waypoint_current_board_id_v1');
      const initialBoardId = urlBoard || savedBoard || null;

      const urlView = params.get('view') as 'board' | 'roadmap' | 'calendar' | null;
      const urlCard = params.get('card') || params.get('c');

      const savedPage = localStorage.getItem('waypoint_current_page_v1') as AppPage | null;
      const savedView = localStorage.getItem('waypoint_current_view_mode_v1') as 'board' | 'roadmap' | 'calendar' | null;
      const savedCard = localStorage.getItem('waypoint_current_card_v1');

      let initialPage: AppPage = 'dashboard';
      if (SHELL_PAGES.includes(urlPage as AppPage)) {
        initialPage = urlPage as AppPage;
      } else if (!urlPage && !urlBoard && SHELL_PAGES.includes(savedPage as AppPage)) {
        initialPage = savedPage as AppPage;
      } else if (urlPage === 'roadmap') {
        initialPage = 'roadmap';
      } else if (urlPage === 'board') {
        initialPage = 'board';
      } else if (urlBoard || (urlPage !== 'dashboard' && (savedPage === 'board' || savedPage === 'roadmap' || (!savedPage && initialBoardId)))) {
        initialPage = savedPage === 'roadmap' ? 'roadmap' : 'board';
      }

      const validViews: Array<'board' | 'roadmap' | 'calendar'> = ['board', 'roadmap', 'calendar'];
      let initialView = validViews.includes(urlView as any)
        ? (urlView as 'board' | 'roadmap' | 'calendar')
        : validViews.includes(savedView as any)
        ? (savedView as 'board' | 'roadmap' | 'calendar')
        : (initialPage === 'roadmap' ? 'roadmap' : 'board');

      if (initialPage === 'board' && initialView === 'roadmap') {
        initialView = 'board';
      } else if (initialPage === 'roadmap' && initialView === 'board') {
        initialView = 'roadmap';
      }

      return {
        page: initialPage,
        boardId: initialBoardId,
        viewMode: initialView,
        cardId: urlCard || savedCard || null,
      };
    } catch {
      return {
        page: 'dashboard' as AppPage,
        boardId: null,
        viewMode: 'board' as const,
        cardId: null,
      };
    }
  };

  const initialRouting = useMemo(() => getInitialRouting(), []);

  // Page routing: dashboard (home), board (active board view), or roadmap (dedicated roadmap view)
  const isMobile = useIsMobile(860);
  const [page, setPage] = useState<AppPage>(initialRouting.page);
  const [quickTask, setQuickTask] = useState<{ boardId?: string | null } | null>(null);
  const myNotifications = useMyNotifications();
  const [inboxSeen, setInboxSeen] = useState(() => getInboxSeen());
  const inboxUnread = page !== 'inbox' && myNotifications.some(n => new Date(n.time).getTime() > inboxSeen);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [openCardId, setOpenCardId] = useState<string | null>(initialRouting.cardId);
  const [openCardBoardId, setOpenCardBoardId] = useState<string | null>(null);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [showCreateRoadmap, setShowCreateRoadmap] = useState(false);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [showBoardSelector, setShowBoardSelector] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'profile' | 'appearance' | 'notifications' | 'email' | 'privacy' | 'labels'>('profile');
  const [notifOpen, setNotifOpen] = useState(false);

  const handleOpenSettings = useCallback((tab: 'profile' | 'appearance' | 'notifications' | 'email' | 'privacy' | 'labels' = 'profile') => {
    setSettingsTab(tab);
    setShowSettings(true);
  }, []);

  // Active view layout & team member filter
  const [viewMode, setViewMode] = useState<'board' | 'roadmap' | 'calendar'>(initialRouting.viewMode);
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null);

  // Synchronize board from URL on initial mount
  useEffect(() => {
    if (initialRouting.boardId) {
      switchBoard(initialRouting.boardId);
    }
  }, [initialRouting.boardId, switchBoard]);

  // Keep URL search params and localStorage in sync as user navigates
  useEffect(() => {
    try {
      if (!isAuthenticated) {
        // If not logged in and not on invite/reset flow, keep the URL clean
        const params = new URLSearchParams(window.location.search);
        if (!params.has('joinBoard') && !params.has('invite') && !params.has('reset') && !params.has('error')) {
          if (window.location.search) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        }
        return;
      }

      localStorage.setItem('waypoint_current_page_v1', page);
      localStorage.setItem('waypoint_current_view_mode_v1', viewMode);
      if (activeBoardId) {
        localStorage.setItem('waypoint_current_board_id_v1', activeBoardId);
      }
      if (openCardId) {
        localStorage.setItem('waypoint_current_card_v1', openCardId);
      } else {
        localStorage.removeItem('waypoint_current_card_v1');
      }

      const params = new URLSearchParams(window.location.search);
      // Preserve invite and password reset flows if active
      if (!params.has('joinBoard') && !params.has('invite') && !params.has('reset')) {
        if (SHELL_PAGES.includes(page)) {
          // Dashboard is the default root view - keep URL clean without ugly ?page=dashboard
          if (page === 'dashboard') params.delete('page');
          else params.set('page', page);
          params.delete('board');
          params.delete('b');
          params.delete('card');
          params.delete('c');
          params.delete('view');
        } else if (page === 'board' || page === 'roadmap') {
          if (page === 'roadmap') {
            params.set('page', 'roadmap');
          } else {
            params.delete('page');
          }
          const boardToSet = activeBoardId || initialRouting.boardId;
          if (boardToSet) params.set('board', boardToSet);
          if (page === 'roadmap' && viewMode === 'roadmap') {
            params.delete('view');
          } else if (page === 'board' && viewMode === 'board') {
            params.delete('view');
          } else {
            params.set('view', viewMode);
          }
          if (openCardId) params.set('card', openCardId);
          else params.delete('card');
        }

        const queryString = params.toString();
        const newUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    } catch {}
  }, [page, activeBoardId, viewMode, openCardId, isAuthenticated, initialRouting.boardId]);

  // Synchronize page type if active board changes or loads
  useEffect(() => {
    if (activeBoardId && (page === 'board' || page === 'roadmap')) {
      const active = visibleBoards.find(b => b.id === activeBoardId);
      if (active) {
        const expectedPage = active.type === 'roadmap' ? 'roadmap' : 'board';
        if (page !== expectedPage) {
          setPage(expectedPage);
        }
      }
    }
  }, [activeBoardId, visibleBoards, page]);

  // When user logs out, reset to dashboard and clean storage/URL
  useEffect(() => {
    if (!isAuthenticated) {
      setPage('dashboard');
      try {
        localStorage.setItem('waypoint_current_page_v1', 'dashboard');
        localStorage.removeItem('waypoint_current_board_id_v1');
        localStorage.removeItem('waypoint_current_card_v1');
        const params = new URLSearchParams(window.location.search);
        if (!params.has('joinBoard') && !params.has('invite') && !params.has('reset') && !params.has('error')) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } catch {}
    }
  }, [isAuthenticated]);

  // If currently on a board or roadmap that gets deleted or left, safely return to dashboard
  useEffect(() => {
    // Wait until boards have loaded once before deciding whether to fallback to dashboard
    if (!hasLoadedOnce && visibleBoards.length === 0) return;

    if (page === 'board' || page === 'roadmap') {
      if (visibleBoards.length === 0) {
        if (hasLoadedOnce) {
          setPage('dashboard');
          try {
            localStorage.setItem('waypoint_current_page_v1', 'dashboard');
            localStorage.removeItem('waypoint_current_board_id_v1');
          } catch {}
        }
        return;
      }
      const boardExists = visibleBoards.some(b => b.id === activeBoardId);
      if (!boardExists) {
        setPage('dashboard');
        try {
          localStorage.setItem('waypoint_current_page_v1', 'dashboard');
          localStorage.removeItem('waypoint_current_board_id_v1');
        } catch {}
      }
    }
  }, [page, activeBoardId, visibleBoards, hasLoadedOnce]);

  const handleSelectBoard = useCallback((boardId: string, view?: 'board' | 'roadmap' | 'calendar') => {
    switchBoard(boardId);
    setShowBoardSelector(false);
    const storeBoards = useWorkStore.getState().boards;
    const targetBoard = visibleBoards.find(b => b.id === boardId) || storeBoards.find(b => b.id === boardId);
    const isRoadmap = targetBoard ? targetBoard.type === 'roadmap' : view === 'roadmap';
    const targetPage = isRoadmap ? 'roadmap' : 'board';
    setPage(targetPage);
    let resolvedView = view;
    if (!resolvedView) {
      if (isRoadmap) {
        resolvedView = viewMode === 'calendar' ? 'calendar' : 'roadmap';
      } else {
        resolvedView = viewMode === 'calendar' ? 'calendar' : 'board';
      }
    } else {
      if (!isRoadmap && resolvedView === 'roadmap') {
        resolvedView = 'board';
      } else if (isRoadmap && resolvedView === 'board') {
        resolvedView = 'roadmap';
      }
    }
    setViewMode(resolvedView);
    try {
      localStorage.setItem('waypoint_current_page_v1', targetPage);
      localStorage.setItem('waypoint_current_board_id_v1', boardId);
      localStorage.setItem('waypoint_current_view_mode_v1', resolvedView);
    } catch {}
  }, [switchBoard, boards, viewMode]);

  const handleNavigate = useCallback((next: AppPage) => {
    setPage(next);
    setFilterMemberId(null);
    if (next === 'inbox' || page === 'inbox') {
      markInboxSeen();
      setInboxSeen(Date.now());
    }
    try {
      localStorage.setItem('waypoint_current_page_v1', next);
      if (SHELL_PAGES.includes(next)) localStorage.removeItem('waypoint_current_card_v1');
    } catch {}
  }, [page]);

  const handleGoToDashboard = useCallback(() => handleNavigate('dashboard'), [handleNavigate]);

  // Global Keyboard Shortcut: Cmd+K / Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

const ALERTED_SOON_KEY = 'waypoint_alerted_soon_v1';
const ALERTED_OVERDUE_KEY = 'waypoint_alerted_overdue_v1';

function getAlertedSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveAlertedSet(key: string, setObj: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(setObj).slice(-300)));
  } catch {
    // ignore
  }
}

  // Due-date checker
  const checkDueDates = useCallback(() => {
    const now = new Date();
    const storeBoards = useWorkStore.getState().boards;
    const alertedSoon = getAlertedSet(ALERTED_SOON_KEY);
    const alertedOverdue = getAlertedSet(ALERTED_OVERDUE_KEY);
    let soonChanged = false;
    let overdueChanged = false;

    storeBoards.forEach(board => {
      board.columns?.forEach(col => {
        col.cards?.forEach(card => {
          if (!card.dueDate || card.completed) return;
          const due = new Date(card.dueDate);
          const diff = due.getTime() - now.getTime();
          const alertId = `${card.id}_${card.dueDate}`;

          // If due within 24h and not yet overdue
          if (diff > 0 && diff < 86400000 && !alertedSoon.has(alertId)) {
            alertedSoon.add(alertId);
            soonChanged = true;

            const targetRecipients = (card.assignees && card.assignees.length > 0)
              ? (card.assignees || []).map(mId => board.members?.find(m => m.id === mId)).filter(Boolean)
              : (board.members || []);

            targetRecipients.forEach(member => {
              if (member && member.email) {
                addNotification(
                  `Due soon: ${card.title}`,
                  `Due ${formatDueDate(card.dueDate)} on board "${board.name}"`,
                  'clock', card.id, board.id, member.email
                );
                useEmailStore.getState().sendEmailNotification({
                  recipient: member,
                  subject: `Reminder: Task Due Soon - ${card.title}`,
                  body: `Hi ${member.name},\n\nThe task "${card.title}" is due soon (${formatDueDate(card.dueDate)}) on board "${board.name}".\n\nWaypoint Team`,
                  eventType: 'due_reminder',
                  metadata: {
                    cardTitle: card.title,
                    boardName: board.name,
                    cardId: card.id,
                    boardId: board.id,
                    dueDate: card.dueDate || undefined,
                  },
                });
              }
            });
          }

          // If overdue (diff <= 0)
          if (diff <= 0 && !alertedOverdue.has(alertId)) {
            alertedOverdue.add(alertId);
            overdueChanged = true;

            const targetRecipients = (card.assignees && card.assignees.length > 0)
              ? (card.assignees || []).map(mId => board.members?.find(m => m.id === mId || (m.email && m.email.toLowerCase().trim() === mId.toLowerCase().trim()))).filter(Boolean)
              : (board.members || []);

            targetRecipients.forEach(member => {
              if (member && member.email) {
                addNotification(
                  `Overdue: ${card.title}`,
                  `Was due ${formatDueDate(card.dueDate)} on board "${board.name}"`,
                  'alert', card.id, board.id, member.email
                );
                useEmailStore.getState().sendEmailNotification({
                  recipient: member,
                  subject: `Alert: Task is Overdue - ${card.title}`,
                  body: `Hi ${member.name},\n\nThe task "${card.title}" was due on ${formatDueDate(card.dueDate)} and is now overdue on board "${board.name}".\n\nWaypoint Team`,
                  eventType: 'due_reminder',
                  metadata: {
                    cardTitle: card.title,
                    boardName: board.name,
                    cardId: card.id,
                    boardId: board.id,
                    dueDate: card.dueDate || undefined,
                  },
                });
              }
            });
          }
        });
      });
    });

    if (soonChanged) saveAlertedSet(ALERTED_SOON_KEY, alertedSoon);
    if (overdueChanged) saveAlertedSet(ALERTED_OVERDUE_KEY, alertedOverdue);
  }, [addNotification]);

  useEffect(() => {
    checkDueDates();
    const interval = setInterval(checkDueDates, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [checkDueDates]);

  // Card modal opener
  const handleOpenCard = (cardId: string, boardId?: string) => {
    setOpenCardId(cardId);
    setOpenCardBoardId(boardId || activeBoardId);
  };

  // ── Dedicated Board Invite Landing Page ──
  if (pendingInvite) {
    return (
      <div className="app-layout">
        <InviteLandingPage
          boardId={pendingInvite.boardId}
          role={pendingInvite.role}
          onAcceptJoin={(boardId) => {
            try {
              localStorage.removeItem('waypoint_pending_invite');
              sessionStorage.removeItem('waypoint_pending_invite');
            } catch {}
            window.history.replaceState({}, document.title, window.location.pathname);
            setPendingInvite(null);
            handleSelectBoard(boardId);
          }}
          onDecline={() => {
            try {
              localStorage.removeItem('waypoint_pending_invite');
              sessionStorage.removeItem('waypoint_pending_invite');
            } catch {}
            window.history.replaceState({}, document.title, window.location.pathname);
            setPendingInvite(null);
            setPage('dashboard');
          }}
        />
        <Toast />
      </div>
    );
  }

  // ── Global Loading Screen ──
  // (1) Auth session not yet resolved, OR (2) first cloud fetch not done yet
  if (!authInitialized || (isAuthenticated && !hasLoadedOnce)) {
    return (
      <div className="app-layout">
        <AppLoadingScreen isDark={isDark} />
        <Toast />
      </div>
    );
  }

  // ── Authentication Check ──
  if (!isAuthenticated) {
    return (
      <div className="app-layout">
        <LoginPage />
        <Toast />
      </div>
    );
  }

  const inProject = page === 'board' || page === 'roadmap';

  const renderPage = () => {
    switch (page) {
      case 'dashboard':
        return (
          <TodayPage
            onOpenCard={handleOpenCard}
            onSelectBoard={id => handleSelectBoard(id)}
            onNewTask={() => setQuickTask({})}
            onCreateBoard={() => setShowCreateBoard(true)}
            onNavigate={handleNavigate}
          />
        );
      case 'mywork':
        return <MyWorkPage onOpenCard={handleOpenCard} onNewTask={() => setQuickTask({})} />;
      case 'projects':
        return (
          <ProjectsPage
            onSelectBoard={id => handleSelectBoard(id)}
            onCreateBoard={() => setShowCreateBoard(true)}
            onCreateRoadmap={() => setShowCreateRoadmap(true)}
          />
        );
      case 'timeline':
        return <TimelinePage onOpenCard={handleOpenCard} onSelectBoard={id => handleSelectBoard(id)} />;
      case 'inbox':
        return <InboxPage onOpenCard={handleOpenCard} />;
      default:
        return (
          <>
            <ProjectHeader
              viewMode={viewMode}
              onSelectView={setViewMode}
              showInbox={showInbox}
              onToggleInbox={() => setShowInbox(s => !s)}
              filterMemberId={filterMemberId}
              onFilterMember={setFilterMemberId}
              onManageMembers={() => setShowMembers(true)}
              onManageEmail={() => handleOpenSettings('email')}
              onNewTask={() => setQuickTask({ boardId: activeBoardId })}
              onLeftProject={() => handleNavigate('projects')}
              onOpenProjectSwitcher={() => setShowBoardSelector(true)}
            />
            <BoardArea
              viewMode={viewMode}
              onSelectView={setViewMode}
              filterMemberId={filterMemberId}
              onClearFilter={() => setFilterMemberId(null)}
              onOpenCard={cardId => handleOpenCard(cardId)}
              onAddColumn={() => setShowAddColumn(true)}
              onCreateBoard={() => setShowCreateBoard(true)}
              showInbox={showInbox}
              onToggleInbox={() => setShowInbox(s => !s)}
            />
          </>
        );
    }
  };

  return (
    <div className="app-layout">
      {/* Mobile Sidebar Backdrop Overlay */}
      <div
        className={`sidebar-backdrop${mobileMenuOpen ? ' open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      <div className={`app-window${(!isMobile && sidebarCollapsed) ? ' sidebar-collapsed-layout' : ''}`}>
        <Sidebar
          page={page}
          onNavigate={handleNavigate}
          onSelectBoard={id => handleSelectBoard(id)}
          onCreateBoard={() => setShowCreateBoard(true)}
          onCreateRoadmap={() => setShowCreateRoadmap(true)}
          onManageMembers={() => setShowMembers(true)}
          onOpenSettings={handleOpenSettings}
          inboxUnread={inboxUnread}
          collapsed={!isMobile && sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
          isMobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
        />

        <div className="app-main-content">
          <Topbar
            page={page}
            onNavigate={handleNavigate}
            onOpenSearch={() => setShowSearch(true)}
            onOpenSettings={handleOpenSettings}
            onToggleNotif={() => setNotifOpen(o => !o)}
            notifOpen={notifOpen}
            onToggleMobileMenu={() => setMobileMenuOpen(o => !o)}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={inProject ? `project-${activeBoardId}` : `page-${page}`}
              variants={isMobile ? pageMobileVariants : pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className={`wp-page-frame${inProject ? ' project' : ''}`}
            >
              {renderPage()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          onOpenCard={(cardId, boardId) => handleOpenCard(cardId, boardId)}
          onSelectBoard={boardId => {
            handleSelectBoard(boardId);
            setShowSearch(false);
          }}
          onFilterMember={memberId => {
            setFilterMemberId(memberId);
            setShowSearch(false);
          }}
          scope={inProject ? 'board' : 'global'}
          activeBoardId={inProject ? activeBoardId : null}
        />
      )}
      {showSettings && (
        <SettingsModal
          initialTab={settingsTab}
          onClose={() => setShowSettings(false)}
        />
      )}
      {showPrivacy && <PrivacyModal onClose={() => setShowPrivacy(false)} />}
      {showCreateBoard && (
        <CreateBoardModal
          onClose={(createdBoardId?: string) => {
            setShowCreateBoard(false);
            if (createdBoardId) {
              switchBoard(createdBoardId);
              setPage('board');
            }
          }}
        />
      )}
      {showCreateRoadmap && (
        <CreateRoadmapModal
          onClose={(createdRoadmapId?: string) => {
            setShowCreateRoadmap(false);
            if (createdRoadmapId) {
              setPage('roadmap');
              setViewMode('roadmap');
              handleSelectBoard(createdRoadmapId, 'roadmap');
            }
          }}
        />
      )}
      {showAddColumn && (
        <AddColumnModal
          onClose={() => setShowAddColumn(false)}
          mode="column"
        />
      )}
      {quickTask && (
        <QuickTaskModal
          boardId={quickTask.boardId}
          onClose={() => setQuickTask(null)}
          onCreated={(cardId, boardId) => handleOpenCard(cardId, boardId)}
          onCreateProject={() => setShowCreateBoard(true)}
        />
      )}
      {showMembers && <MembersModal onClose={() => setShowMembers(false)} />}
      {showEmail && <EmailNotifModal onClose={() => setShowEmail(false)} />}

      {/* Card Detail */}
      {openCardId && (
        <CardModal
          cardId={openCardId}
          boardId={openCardBoardId}
          onClose={() => { setOpenCardId(null); setOpenCardBoardId(null); }}
        />
      )}

      {/* Notification Panel */}
      <NotifPanel
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        onOpenCard={(cardId, boardId) => {
          handleOpenCard(cardId, boardId);
          if (boardId && boardId !== activeBoardId) {
            useWorkStore.getState().switchBoard(boardId);
          }
        }}
      />

      {/* Global Off-canvas Overlay Inbox Drawer (Mobile) */}
      {isMobile && (
        <InboxDrawer
          isOpen={showInbox}
          onClose={() => setShowInbox(false)}
          board={currentBoard}
          onOpenCard={cardId => handleOpenCard(cardId)}
          docked={false}
        />
      )}

      {/* Mobile Quick Bottom Navigation Bar */}
      <MobileBottomNav
        page={page}
        inboxUnread={inboxUnread}
        onNavigate={p => {
          handleNavigate(p);
          setMobileMenuOpen(false);
          setShowBoardSelector(false);
        }}
        onNewTask={() => {
          setQuickTask(inProject ? { boardId: activeBoardId } : {});
          setShowBoardSelector(false);
          setMobileMenuOpen(false);
        }}
      />

      {/* Mobile Board Selector Bottom Sheet */}
      <MobileBoardSelector
        isOpen={showBoardSelector}
        onClose={() => setShowBoardSelector(false)}
        boards={visibleBoards}
        activeBoardId={activeBoardId}
        onSelectBoard={(boardId) => {
          handleSelectBoard(boardId);
          setViewMode('board');
          setShowBoardSelector(false);
        }}
        onCreateBoard={() => {
          setShowBoardSelector(false);
          setShowCreateBoard(true);
        }}
      />

      {/* Toasts */}
      <Toast />

      {/* Global Centered Confirmation Dialog */}
      <ConfirmModal />
    </div>
  );
}
