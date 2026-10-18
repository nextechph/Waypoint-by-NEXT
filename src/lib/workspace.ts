import { useMemo } from 'react';
import { useWorkStore } from '../store/useWorkStore';
import { useAuthStore } from '../store/useAuthStore';
import { useNotifStore } from '../store/useNotifStore';
import type { Board, Card, Member } from '../types';

/** Top-level pages of the Waypoint shell. */
export type AppPage = 'dashboard' | 'mywork' | 'projects' | 'timeline' | 'inbox' | 'board' | 'roadmap';
export type ViewMode = 'board' | 'roadmap' | 'calendar';

export const SHELL_PAGES: AppPage[] = ['dashboard', 'mywork', 'projects', 'timeline', 'inbox'];

export interface CardMeta {
  card: Card;
  board: Board;
  columnId: string;
  columnName: string;
}

export interface ProjectStats {
  total: number;
  done: number;
  progress: number;
  /** Latest due date across open cards (ISO), or null. */
  due: string | null;
  /** Earliest start/due date across cards (ISO), or null. */
  start: string | null;
  /** Latest due/end date across all cards (ISO), or null. */
  end: string | null;
  overdue: number;
}

const norm = (v?: string | null) => (v || '').toLowerCase().trim();

export function isMe(member: Member | undefined, user: { email?: string; name?: string } | null | undefined): boolean {
  if (!member || !user) return false;
  if (user.email && member.email && norm(member.email) === norm(user.email)) return true;
  return Boolean(user.name && member.name && norm(member.name) === norm(user.name));
}

export function isAssignedToMe(item: CardMeta, user: { email?: string; name?: string } | null | undefined): boolean {
  return (item.card.assignees || []).some(id => isMe(item.board.members?.find(m => m.id === id), user));
}

export function canEditBoard(board: Board | null | undefined, email?: string): boolean {
  if (!board) return false;
  if (!board.createdBy) return true;
  const e = norm(email);
  if (!e) return false;
  if (norm(board.createdBy) === e) return true;
  return (board.members || []).some(m => norm(m.email) === e && m.role !== 'observer');
}

export function isBoardOwner(board: Board | null | undefined, email?: string): boolean {
  return !board?.createdBy || (!!email && norm(board.createdBy) === norm(email));
}

export function projectStats(board: Board): ProjectStats {
  let total = 0, done = 0, overdue = 0;
  let due: string | null = null, start: string | null = null, end: string | null = null;
  const now = Date.now();
  (board.columns || []).forEach(col => (col.cards || []).forEach(card => {
    total++;
    if (card.completed) done++;
    const s = card.startDate || card.dueDate;
    if (s && (!start || s < start)) start = s;
    const e = card.dueDate || card.startDate;
    if (e && (!end || e > end)) end = e;
    if (!card.completed && card.dueDate) {
      if (!due || card.dueDate > due) due = card.dueDate;
      if (new Date(card.dueDate).getTime() < now) overdue++;
    }
  }));
  return { total, done, progress: total ? Math.round((done / total) * 100) : 0, due, start, end, overdue };
}

/** Visible boards plus every card with its board/column for the current user. */
export function useWorkspace() {
  const allBoards = useWorkStore(s => s.boards);
  const getVisibleBoards = useWorkStore(s => s.getVisibleBoards);
  const user = useAuthStore(s => s.user);

  const boards = useMemo(() => getVisibleBoards(user?.email), [getVisibleBoards, user?.email, allBoards]);
  const cards = useMemo(() => {
    const list: CardMeta[] = [];
    boards.forEach(board => (board.columns || []).forEach(col => (col.cards || []).forEach(card => {
      list.push({ card, board, columnId: col.id, columnName: col.name });
    })));
    return list;
  }, [boards]);
  const myCards = useMemo(() => cards.filter(c => isAssignedToMe(c, user)), [cards, user]);

  return { user, boards, cards, myCards };
}

/** Notifications addressed to the current user, newest first. */
export function useMyNotifications() {
  const raw = useNotifStore(s => s.notifications);
  const user = useAuthStore(s => s.user);
  return useMemo(() => {
    const email = norm(user?.email);
    return raw
      .filter(n => !n.recipientEmail || !email || n.recipientEmail === email)
      .slice()
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [raw, user?.email]);
}

const INBOX_SEEN_KEY = 'waypoint_inbox_seen_v1';

export function getInboxSeen(): number {
  try { return Number(localStorage.getItem(INBOX_SEEN_KEY)) || 0; } catch { return 0; }
}

export function markInboxSeen() {
  try { localStorage.setItem(INBOX_SEEN_KEY, String(Date.now())); } catch {}
}

/** "2026-10-22" or ISO → Date at local midnight-safe parse. */
export function toDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
}

export function hasTime(value: string): boolean {
  return !/^\d{4}-\d{2}-\d{2}$/.test(value) && !/T00:00(:00(\.000)?)?(Z)?$/.test(value);
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function dayDiff(a: Date, b: Date): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86_400_000);
}

export function formatShortDate(value: string): string {
  return toDate(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(value: string): string {
  return toDate(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Rank open tasks for "Today's direction": overdue → due soonest → urgent labels → newest. */
export function priorityScore(item: CardMeta): number {
  const { card } = item;
  let score = 0;
  if (card.dueDate) {
    const days = dayDiff(toDate(card.dueDate), new Date());
    score += days < 0 ? 1000 - days : Math.max(0, 500 - days * 20);
  }
  const labels = (card.labels || []).map(l => l.toLowerCase());
  if (labels.some(l => l.includes('urgent') || l.includes('bug'))) score += 300;
  if (/urgent|progress|doing|active/i.test(item.columnName)) score += 120;
  return score;
}
