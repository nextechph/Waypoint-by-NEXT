import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkStore } from '../store/useWorkStore';
import { useAuthStore } from '../store/useAuthStore';
import { sortMembersWithOwnerFirst, useIsMobile } from '../utils';
import { canEditBoard, isBoardOwner, projectStats } from '../lib/workspace';
import { MilestoneStepper, type ProjectTab } from './ProjectViews';
import { AvatarStack, MemberAvatar, ProgressBar } from './wp/primitives';
import { useProjectActions } from './wp/useProjectActions';
import { Plus, MoreHorizontal, Users, Mail, Pencil, Trash2, LogOut, Filter, X, Inbox, SquaresFour, Flag, Kanban, Calendar, FileText, Activity, Milestone } from './ui/icons';

interface Props {
  tab: ProjectTab;
  onSelectTab: (tab: ProjectTab) => void;
  onOpenCard: (cardId: string) => void;
  showInbox: boolean;
  onToggleInbox: () => void;
  filterMemberId: string | null;
  onFilterMember: (id: string | null) => void;
  onManageMembers: () => void;
  onManageEmail: () => void;
  onNewTask: () => void;
  onLeftProject: () => void;
  onOpenProjectSwitcher?: () => void;
}

export default function ProjectHeader({
  tab,
  onSelectTab,
  onOpenCard,
  showInbox,
  onToggleInbox,
  filterMemberId,
  onFilterMember,
  onManageMembers,
  onManageEmail,
  onNewTask,
  onLeftProject,
  onOpenProjectSwitcher,
}: Props) {
  const boards = useWorkStore(s => s.boards);
  const activeBoardId = useWorkStore(s => s.activeBoardId);
  const user = useAuthStore(s => s.user);
  const board = boards.find(b => b.id === activeBoardId) || null;
  const isMobile = useIsMobile(860);
  const { rename, removeOrLeave } = useProjectActions();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen && !filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuOpen && !menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
      if (filterOpen && !filterRef.current?.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen, filterOpen]);

  if (!board) return null;

  const isRoadmap = board.type === 'roadmap';
  const editable = canEditBoard(board, user?.email);
  const owner = isBoardOwner(board, user?.email);
  const isObserver = !editable;
  const members = sortMembersWithOwnerFirst(board.members || [], board.createdBy);
  const stats = projectStats(board);
  const filterMember = members.find(m => m.id === filterMemberId);
  const inboxCount = board.inboxCards?.length || 0;

  const tabs: Array<{ id: ProjectTab; label: string; icon: typeof Flag }> = [
    { id: 'overview', label: 'Overview', icon: SquaresFour },
    { id: 'milestones', label: 'Milestones', icon: Flag },
    { id: 'tasks', label: isRoadmap ? 'Roadmap' : 'Tasks', icon: isRoadmap ? Milestone : Kanban },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'files', label: 'Files', icon: FileText },
    { id: 'activity', label: 'Activity', icon: Activity },
  ];
  const workView = tab === 'tasks' || tab === 'calendar';

  const commitName = () => {
    rename(board, name);
    setEditing(false);
  };

  return (
    <section className="wp-project-header">
      <div className="wp-project-header-top">
        <div className="wp-project-title-block">
          <div className="wp-eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{isRoadmap ? 'Roadmap' : 'Task board'}</span>
            <span className="wp-dot-sep" />
            <span>{stats.done}/{stats.total} complete</span>
            {isObserver && (
              <>
                <span className="wp-dot-sep" />
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>View only</span>
              </>
            )}
          </div>
          <div className="wp-project-title-row">
            {editing ? (
              <input
                className="wp-title-input"
                value={name}
                autoFocus
                onChange={e => setName(e.target.value)}
                onBlur={commitName}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitName();
                  if (e.key === 'Escape') setEditing(false);
                }}
              />
            ) : (
              <h1
                className="wp-project-title"
                onDoubleClick={() => { if (editable) { setName(board.name); setEditing(true); } }}
                onClick={() => { if (isMobile && onOpenProjectSwitcher) onOpenProjectSwitcher(); }}
                title={editable ? 'Double-click to rename' : undefined}
              >
                {board.name}
                {isMobile && onOpenProjectSwitcher && <span className="wp-title-caret">▾</span>}
              </h1>
            )}
          </div>
          {board.description && <p className="wp-project-desc">{board.description}</p>}
        </div>

        <div className="wp-project-actions">
          <div className="wp-project-progress hide-on-mobile">
            <div className="wp-eyebrow">Progress</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 120 }}><ProgressBar value={stats.progress} /></div>
              <span className="wp-num">{stats.progress}%</span>
            </div>
          </div>
          <div className="hide-on-mobile">
            <div className="wp-eyebrow">Team</div>
            <AvatarStack members={members} size={26} max={4} onClick={onManageMembers} />
          </div>
          {!isObserver && (
            <button type="button" className="wp-btn wp-btn-outline" onClick={onNewTask}>
              <Plus size={15} weight="bold" /> New task
            </button>
          )}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button type="button" className="wp-icon-ghost bordered" onClick={() => setMenuOpen(o => !o)} title="Project options" aria-label="Project options">
              <MoreHorizontal size={18} weight="bold" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  className="wp-menu"
                  style={{ right: 0, top: 'calc(100% + 8px)', width: 220 }}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                >
                  <button type="button" className="wp-menu-item" onClick={() => { setMenuOpen(false); onManageMembers(); }}>
                    <Users size={16} /> Members & invites
                  </button>
                  <button type="button" className="wp-menu-item" onClick={() => { setMenuOpen(false); onManageEmail(); }}>
                    <Mail size={16} /> Email updates
                  </button>
                  {editable && (
                    <>
                      <button type="button" className="wp-menu-item" onClick={() => { setMenuOpen(false); setName(board.name); setEditing(true); }}>
                        <Pencil size={16} /> Rename
                      </button>
                    </>
                  )}
                  <div className="wp-menu-sep" />
                  <button
                    type="button"
                    className="wp-menu-item danger"
                    onClick={() => { setMenuOpen(false); removeOrLeave(board, onLeftProject); }}
                  >
                    {owner ? <Trash2 size={16} /> : <LogOut size={16} />}
                    {owner ? 'Delete project' : 'Leave project'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {!workView && <MilestoneStepper board={board} onOpenCard={onOpenCard} />}

      <div className="wp-tabs-row">
        <div className="wp-tabs" role="tablist">
          {tabs.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`wp-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => onSelectTab(t.id)}
            >
              <t.icon size={16} weight={tab === t.id ? 'fill' : 'regular'} />
              {t.label}
            </button>
          ))}
          {!isRoadmap && tab === 'tasks' && (
            <button
              type="button"
              className={`wp-tab wp-tab-toggle${showInbox ? ' active' : ''}`}
              onClick={onToggleInbox}
              title="Backlog inbox"
            >
              <Inbox size={16} />
              Inbox
              {inboxCount > 0 && <span className="wp-count">{inboxCount}</span>}
            </button>
          )}
        </div>

        <div ref={filterRef} style={{ position: 'relative', visibility: workView ? undefined : 'hidden' }}>
          {filterMember ? (
            <span className="wp-filter-chip">
              <MemberAvatar member={filterMember} size={18} ring={false} />
              {filterMember.name}
              <button type="button" onClick={() => onFilterMember(null)} aria-label="Clear filter"><X size={12} weight="bold" /></button>
            </span>
          ) : (
            <button type="button" className="wp-filter-btn" onClick={() => setFilterOpen(o => !o)}>
              <Filter size={15} /> Filter<span className="hide-on-mobile-inline">&nbsp;by member</span>
            </button>
          )}
          <AnimatePresence>
            {filterOpen && (
              <motion.div
                className="wp-menu"
                style={{ right: 0, top: 'calc(100% + 8px)', width: 240, maxHeight: 320, overflowY: 'auto' }}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.12 }}
              >
                {members.map(m => (
                  <button key={m.id} type="button" className="wp-menu-item" onClick={() => { onFilterMember(m.id); setFilterOpen(false); }}>
                    <MemberAvatar member={m} size={20} ring={false} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                  </button>
                ))}
                {members.length === 0 && <div className="wp-menu-empty">No members yet</div>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
