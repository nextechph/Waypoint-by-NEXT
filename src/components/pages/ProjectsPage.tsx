import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sortMembersWithOwnerFirst } from '../../utils';
import { useWorkspace, projectStats, canEditBoard, isBoardOwner, formatShortDate } from '../../lib/workspace';
import type { Board } from '../../types';
import { AvatarStack, EmptyState, ProgressBar, SummitCover } from '../wp/primitives';
import { useProjectActions } from '../wp/useProjectActions';
import { dropdownMotion, revealItem } from '../../lib/motion';
import { NumberPop, RevealLines, useSlidingPill } from '../ui/transitions';
import { Plus, KanbanSquare, Milestone, Search, MoreHorizontal, Pencil, Trash2, LogOut, CheckSquare, X } from '../ui/icons';

interface Props {
  onSelectBoard: (boardId: string) => void;
  onCreateBoard: () => void;
  onCreateRoadmap: () => void;
}

type Tab = 'all' | 'boards' | 'roadmaps' | 'completed';

export default function ProjectsPage({ onSelectBoard, onCreateBoard, onCreateRoadmap }: Props) {
  const { user, boards } = useWorkspace();
  const { rename, recolor, removeOrLeave, removeMany } = useProjectActions();

  const [tab, setTab] = useState<Tab>('all');
  const [query, setQuery] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);
  const filterTabs = useSlidingPill<HTMLDivElement>(tab);
  const createMenu = dropdownMotion('top-right');

  useEffect(() => {
    if (!createOpen) return;
    const handler = (e: MouseEvent) => { if (!createRef.current?.contains(e.target as Node)) setCreateOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [createOpen]);

  const withStats = useMemo(() => boards.map(b => ({ board: b, stats: projectStats(b) })), [boards]);
  const counts = {
    all: withStats.length,
    boards: withStats.filter(x => x.board.type !== 'roadmap').length,
    roadmaps: withStats.filter(x => x.board.type === 'roadmap').length,
    completed: withStats.filter(x => x.stats.total > 0 && x.stats.progress === 100).length,
  };

  const shown = withStats.filter(({ board, stats }) => {
    if (tab === 'boards' && board.type === 'roadmap') return false;
    if (tab === 'roadmaps' && board.type !== 'roadmap') return false;
    if (tab === 'completed' && !(stats.total > 0 && stats.progress === 100)) return false;
    return !query.trim() || board.name.toLowerCase().includes(query.trim().toLowerCase());
  });

  const toggle = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const exitSelect = () => { setSelecting(false); setSelected(new Set()); };

  return (
    <div className="wp-page">
      <div className="wp-page-inner">
        <header className="wp-hero compact">
          <RevealLines>
            <h1 className="wp-display md">Projects.</h1>
            <p className="wp-lede">Every board and roadmap your team is moving forward.</p>
          </RevealLines>
          <div ref={createRef} style={{ position: 'relative' }}>
            <button type="button" className="wp-btn wp-btn-outline lg" onClick={() => setCreateOpen(o => !o)}>
              <Plus size={16} weight="bold" /> New project
            </button>
            <AnimatePresence>
              {createOpen && (
                <motion.div
                  className="wp-menu"
                  {...createMenu}
                  style={{ right: 0, top: 'calc(100% + 8px)', width: 260, ...createMenu.style }}
                >
                  <button type="button" className="wp-menu-item tall" onClick={() => { setCreateOpen(false); onCreateBoard(); }}>
                    <span className="wp-menu-icon"><KanbanSquare size={18} /></span>
                    <span><strong>Task board</strong><small>Kanban columns for day-to-day work</small></span>
                  </button>
                  <button type="button" className="wp-menu-item tall" onClick={() => { setCreateOpen(false); onCreateRoadmap(); }}>
                    <span className="wp-menu-icon"><Milestone size={18} /></span>
                    <span><strong>Roadmap</strong><small>Phases and a Gantt timeline</small></span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        <div className="wp-toolbar">
          <div ref={filterTabs.barRef} className="wp-tabs has-pill">
            {filterTabs.pill}
            {([['all', 'All'], ['boards', 'Boards'], ['roadmaps', 'Roadmaps'], ['completed', 'Completed']] as const).map(([id, label]) => (
              <button key={id} type="button" className={`wp-tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
                {label} <span className="wp-count"><NumberPop value={counts[id]} /></span>
              </button>
            ))}
          </div>
          <div className="wp-toolbar-right">
            <label className="wp-search-field">
              <Search size={15} className="wp-search-icon" />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search projects…" />
            </label>
            {selecting ? (
              <>
                <button
                  type="button"
                  className="wp-btn wp-btn-ghost"
                  onClick={() => setSelected(selected.size === shown.length ? new Set() : new Set(shown.map(s => s.board.id)))}
                >
                  {selected.size === shown.length && shown.length > 0 ? 'Deselect all' : 'Select all'}
                </button>
                <button
                  type="button"
                  className="wp-btn wp-btn-danger"
                  disabled={!selected.size}
                  onClick={() => removeMany(boards.filter(b => selected.has(b.id)), exitSelect)}
                >
                  <Trash2 size={15} /> Delete {selected.size || ''}
                </button>
                <button type="button" className="wp-icon-ghost bordered" onClick={exitSelect} aria-label="Cancel selection"><X size={16} /></button>
              </>
            ) : (
              boards.length > 0 && (
                <button type="button" className="wp-btn wp-btn-ghost" onClick={() => setSelecting(true)}>
                  <CheckSquare size={15} /> Select
                </button>
              )
            )}
          </div>
        </div>

        {boards.length === 0 ? (
          <EmptyState
            title="Start your first project"
            body="A task board keeps daily work moving; a roadmap plans the bigger route."
            action={
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="wp-btn wp-btn-primary" onClick={onCreateBoard}><KanbanSquare size={15} /> Task board</button>
                <button type="button" className="wp-btn wp-btn-outline" onClick={onCreateRoadmap}><Milestone size={15} /> Roadmap</button>
              </div>
            }
          />
        ) : (
          <div className="wp-project-grid">
            {shown.map(({ board, stats }, i) => (
              <ProjectCard
                key={board.id}
                index={i}
                board={board}
                progress={stats.progress}
                total={stats.total}
                due={stats.due}
                editable={canEditBoard(board, user?.email)}
                owner={isBoardOwner(board, user?.email)}
                selecting={selecting}
                selected={selected.has(board.id)}
                onOpen={() => (selecting ? toggle(board.id) : onSelectBoard(board.id))}
                onRename={name => rename(board, name)}
                onRecolor={c => recolor(board, c)}
                onRemove={() => removeOrLeave(board)}
              />
            ))}
            {!selecting && (
              <button type="button" className="wp-project-card create" onClick={onCreateBoard}>
                <span className="wp-create-icon"><Plus size={22} /></span>
                <strong>Create new project</strong>
                <span>Start a board and bring your team together.</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectCard({
  index, board, progress, total, due, editable, owner, selecting, selected, onOpen, onRename, onRecolor, onRemove,
}: {
  index: number;
  board: Board;
  progress: number;
  total: number;
  due: string | null;
  editable: boolean;
  owner: boolean;
  selecting: boolean;
  selected: boolean;
  onOpen: () => void;
  onRename: (name: string) => void;
  onRecolor: (color: string) => void;
  onRemove: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(board.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const optionsMenu = dropdownMotion('top-right');

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const commit = () => { onRename(name); setEditing(false); };
  const members = sortMembersWithOwnerFirst(board.members || [], board.createdBy);

  return (
    <motion.div
      className={`wp-project-card${selected ? ' selected' : ''}`}
      {...revealItem(Math.min(index, 8))}
      onClick={() => { if (!editing) onOpen(); }}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' && !editing) onOpen(); }}
      style={{ zIndex: menuOpen ? 30 : undefined }}
    >
      <SummitCover id={board.id} />
      {selecting && (
        // The card itself toggles selection, so the check is display-only (a nested button would double-fire on Enter).
        <span className={`t-check wp-tcheck wp-check wp-card-check${selected ? ' checked' : ''}`} aria-checked={selected} aria-hidden>
          <svg viewBox="0 0 10.1668 10.1668" aria-hidden style={{ ['--check-len' as string]: 15 }}>
            <path d="M1 5.52L3.92 9.17L9.17 1" />
          </svg>
        </span>
      )}
      <div className="wp-project-card-body">
        <div className="wp-project-card-head">
          {editing ? (
            <input
              className="wp-inline-input"
              value={name}
              autoFocus
              onClick={e => e.stopPropagation()}
              onChange={e => setName(e.target.value)}
              onBlur={commit}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
            />
          ) : (
            <span className="wp-project-card-title">{board.name}</span>
          )}
          {!selecting && (
            <div ref={menuRef} style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
              <button type="button" className="wp-icon-ghost sm" onClick={() => setMenuOpen(o => !o)} aria-label="Project options">
                <MoreHorizontal size={18} weight="bold" />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    className="wp-menu"
                    {...optionsMenu}
                    style={{ right: 0, top: 'calc(100% + 6px)', width: 190, ...optionsMenu.style }}
                  >
                    {editable && (
                      <>
                        <button type="button" className="wp-menu-item" onClick={() => { setMenuOpen(false); setName(board.name); setEditing(true); }}>
                          <Pencil size={16} /> Rename
                        </button>

                        <div className="wp-menu-sep" />
                      </>
                    )}
                    <button type="button" className="wp-menu-item danger" onClick={() => { setMenuOpen(false); onRemove(); }}>
                      {owner ? <Trash2 size={16} /> : <LogOut size={16} />} {owner ? 'Delete' : 'Leave'}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          )}
        </div>
        <div className="wp-project-card-meta">
          {board.type === 'roadmap' ? 'Roadmap' : 'Board'}
          <span className="wp-dot-sep" />
          <NumberPop value={total} /> {total === 1 ? 'task' : 'tasks'}
          {due && (<><span className="wp-dot-sep" />Due {formatShortDate(due)}</>)}
        </div>
        <div className="wp-project-card-progress">
          <ProgressBar value={progress} />
          <span className="wp-num"><NumberPop value={progress} />%</span>
        </div>
        <div className="wp-project-card-foot">
          <AvatarStack members={members} size={24} />
          <span className="wp-muted-sm">{members.length} {members.length === 1 ? 'member' : 'members'}</span>
        </div>
      </div>
    </motion.div>
  );
}
