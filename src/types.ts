// ── Domain Types ──────────────────────────────────────────────────────

export type MemberRole = 'owner' | 'admin' | 'member' | 'observer';

export interface Member {
  id: string;
  name: string;
  email: string;
  color: string;
  avatarUrl?: string;
  role?: MemberRole;
  borderStyle?: string; // e.g. 'frontend', 'backend', 'gold', 'none'
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  addedAt: string;
}

export interface Comment {
  id: string;
  author: string;
  authorInitials: string;
  avatarColor: string;
  text: string;
  createdAt: string;
  parentId?: string | null;
  replyToAuthor?: string | null;
  authorEmail?: string;
  authorId?: string;
  attachments?: Attachment[];
}

export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  startDate: string; // ISO date string YYYY-MM-DD
  endDate: string;   // ISO date string YYYY-MM-DD
  status: 'planned' | 'active' | 'completed';
  color?: string;
}

/** A contiguous range of calendar days when work on a task was paused/suspended. */
export interface WorkSuspension {
  /** ISO date string (YYYY-MM-DD) – first day work stopped */
  from: string;
  /** ISO date string (YYYY-MM-DD) – last day before work resumed */
  to: string;
  /** Optional human-readable reason, e.g. "Client hold", "Holiday shutdown" */
  reason?: string;
}

export interface Subtask {
  id: string;
  title: string;
  done: boolean;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  comments: Comment[];
  attachments: Attachment[];
  labels: string[];
  assignees: string[];
  dueDate: string | null;
  startDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  sprintId?: string | null;
  isMilestone?: boolean;
  progress?: number; // 0 to 100 percentage
  dependencies?: string[]; // card IDs this card depends on
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  coverAttachmentId?: string | null;
  isInbox?: boolean;
  /** Periods when work was paused. Variance calc subtracts these days from elapsed time. */
  workSuspensions?: WorkSuspension[];
  /** Dates (YYYY-MM-DD) confirmed as worked via manual mark or automatic activity. */
  workedDays?: string[];
  /** Optional reference to a Project Roadmap */
  linkedRoadmapId?: string | null;
  /** Checklist items shown in the task detail. */
  subtasks?: Subtask[];
  // due-date alert flags
  [key: string]: unknown;
}

export interface Column {
  id: string;
  name: string;
  cards: Card[];
}

export interface Board {
  id: string;
  name: string;
  color: string;
  type?: 'board' | 'roadmap';
  description?: string;
  createdBy?: string; // email of the user who created this board
  members: Member[];
  columns: Column[];
  inboxCards?: Card[];
  sprints?: Sprint[];
}

export interface Notification {
  id: string;
  title: string;
  sub: string;
  icon: string;
  cardId: string | null;
  boardId: string | null;
  recipientEmail?: string | null;
  time: string;
}

export interface EmailNotificationLog {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  body: string;
  sentAt: string;
  status: 'sent' | 'failed';
  eventType: 'card_assigned' | 'status_changed' | 'due_reminder' | 'comment_added' | 'member_added' | 'mention';
}

export interface EmailSettings {
  enabled: boolean;
  notifyOnAssign: boolean;
  notifyOnDue: boolean;
  notifyOnStatusChange: boolean;
  notifyOnMention: boolean;
  senderEmail: string;
}

// ── Border Style Presets ───────────────────────────────────────────────

export interface BorderPreset {
  key: string;
  label: string;
  group: 'tech' | 'work' | 'none';
  badgeText?: string;
  /** CSS gradient/color string for the border ring */
  gradient: string;
  /** Optional: animated */
  animated?: boolean;
}

export interface CustomBorderDef {
  id: string;
  label: string;
  badgeText: string;
  color: string;
  gradient?: string;
  styleType: 'gradient' | 'solid' | 'glow' | 'dashed';
}

export const BORDER_PRESETS: BorderPreset[] = [
  // ── Engineering & Tech Roles ──────────────────────────────────────────
  { key: 'frontend',  label: 'Frontend Dev',      group: 'tech', badgeText: 'FE',     gradient: 'linear-gradient(135deg, #0ea5e9, #06b6d4, #38bdf8)' },
  { key: 'backend',   label: 'Backend Dev',       group: 'tech', badgeText: 'BE',     gradient: 'linear-gradient(135deg, #f97316, #fb923c, #f59e0b)' },
  { key: 'fullstack', label: 'Full-Stack Dev',    group: 'tech', badgeText: 'FS',     gradient: 'linear-gradient(135deg, #6366f1, #0ea5e9, #10b981, #f59e0b)' },
  { key: 'devops',    label: 'DevOps / Cloud',    group: 'tech', badgeText: 'DevOps', gradient: 'linear-gradient(135deg, #10b981, #14b8a6, #34d399)' },
  { key: 'mobile',    label: 'Mobile Dev',        group: 'tech', badgeText: 'Mobile', gradient: 'linear-gradient(135deg, #f59e0b, #eab308, #fbbf24)' },
  { key: 'qa',        label: 'QA / Testing',      group: 'tech', badgeText: 'QA',     gradient: 'linear-gradient(135deg, #8b5cf6, #6366f1, #a78bfa)' },
  { key: 'data',      label: 'Data / AI / ML',    group: 'tech', badgeText: 'Data',   gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef)' },
  { key: 'security',  label: 'SecOps / Security', group: 'tech', badgeText: 'SecOps', gradient: 'linear-gradient(135deg, #ef4444, #f87171, #dc2626)' },

  // ── Workplace & Product Roles ───────────────────────────────────────────
  { key: 'designer',  label: 'UI/UX Design',       group: 'work', badgeText: 'UI/UX',  gradient: 'linear-gradient(135deg, #ec4899, #f43f5e, #fb7185)' },
  { key: 'pm',        label: 'Product Manager',    group: 'work', badgeText: 'PM',     gradient: 'linear-gradient(135deg, #f59e0b, #fbbf24, #d97706)' },
  { key: 'scrum',     label: 'Scrum Master',       group: 'work', badgeText: 'Scrum',  gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee, #0891b2)' },
  { key: 'techlead',  label: 'Tech Lead',          group: 'work', badgeText: 'Lead',   gradient: 'linear-gradient(135deg, #eab308, #facc15, #ca8a04)' },
  { key: 'analyst',   label: 'Business Analyst',   group: 'work', badgeText: 'BA',     gradient: 'linear-gradient(135deg, #10b981, #34d399, #059669)' },
  { key: 'marketing', label: 'Growth / Marketing', group: 'work', badgeText: 'Growth', gradient: 'linear-gradient(135deg, #d946ef, #e879f9, #c026d3)' },
  { key: 'support',   label: 'IT / Operations',    group: 'work', badgeText: 'Ops',    gradient: 'linear-gradient(135deg, #64748b, #94a3b8, #475569)' },

  // ── Default ───────────────────────────────────────────────────────────
  { key: 'none',      label: 'No Role / Border',   group: 'none', gradient: 'none' },
];

// ── Constants ──────────────────────────────────────────────────────────

export const BOARD_COLORS = [
  { name: 'Ink',      value: '#8A8F98' },
  { name: 'Graphite', value: '#6B7280' },
  { name: 'Slate',    value: '#6B7280' },
  { name: 'Ash',      value: '#9CA3AF' },
  { name: 'Mist',     value: '#A1A6AE' },
  { name: 'White',    value: '#B4B8BF' },
] as const;

export const AVATAR_COLORS = [
  '#6B7280','#7A7F88','#80858E','#6B7280','#80858E','#4A4F57',
] as const;

export const LABELS = [
  { id: 'general',  name: 'General',  color: '#6B7280' },
  { id: 'task',     name: 'Task',     color: '#80858E' },
  { id: 'planning', name: 'Planning', color: '#80858E' },
  { id: 'research', name: 'Research', color: '#9CA3AF' },
  { id: 'review',   name: 'Review',   color: '#6B7280' },
  { id: 'urgent',   name: 'Urgent',   color: '#8A8F98' },
  { id: 'done',     name: 'Done',     color: '#9CA3AF' },
  { id: 'design',   name: 'Design',   color: '#80858E' },
  { id: 'feature',  name: 'Feature',  color: '#6B7280' },
  { id: 'bug',      name: 'Bug',      color: '#8A8F98' },
  { id: 'backend',  name: 'Backend',  color: '#7A7F88' },
  { id: 'frontend', name: 'Frontend', color: '#80858E' },
] as const;
