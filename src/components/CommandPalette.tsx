import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useThemeStore } from '../store/useThemeStore';
import { useWorkspace, timeAgo, type AppPage } from '../lib/workspace';
import { getRecent } from '../lib/recent';
import { MemberAvatar } from './wp/primitives';
import type { Member } from '../types';

interface Props {
  onClose: () => void;
  onOpenCard: (cardId: string, boardId: string) => void;
  onSelectBoard: (boardId: string) => void;
  onSelectPerson: (boardId: string, memberId: string) => void;
  onNavigate: (page: AppPage) => void;
  onNewTask: () => void;
  onCreateBoard: () => void;
  onCreateRoadmap: () => void;
  onInvite?: () => void;
  onOpenSettings: () => void;
}

type Scope = 'all' | 'projects' | 'tasks' | 'people' | 'actions';

interface Row {
  key: string;
  group: string;
  title: string;
  meta?: string;
  avatar?: Member;
  kind: string;
  run: () => void;
}

export default function CommandPalette(props: Props) {
  const { onClose } = props;
  const { boards, cards } = useWorkspace();
  const toggleTheme = useThemeStore(s => s.toggle);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [cursor, setCursor] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const run = (fn: () => void) => () => { onClose(); fn(); };

  const actions: Row[] = useMemo(() => [
    { key: 'a-task', group: 'Quick actions', kind: 'Action', title: 'Add task', run: run(props.onNewTask) },
    { key: 'a-board', group: 'Quick actions', kind: 'Action', title: 'Create new project', meta: 'Task board', run: run(props.onCreateBoard) },
    { key: 'a-roadmap', group: 'Quick actions', kind: 'Action', title: 'Create new roadmap', run: run(props.onCreateRoadmap) },
    { key: 'a-cal', group: 'Quick actions', kind: 'Action', title: 'View calendar', run: run(() => props.onNavigate('calendar')) },
    { key: 'a-time', group: 'Quick actions', kind: 'Action', title: 'View timeline', run: run(() => props.onNavigate('timeline')) },
    ...(props.onInvite ? [{ key: 'a-invite', group: 'Quick actions', kind: 'Action', title: 'Invite team member', run: run(props.onInvite) }] : []),
    { key: 'a-theme', group: 'Quick actions', kind: 'Action', title: 'Switch light / dark', run: () => toggleTheme() },
    { key: 'a-settings', group: 'Quick actions', kind: 'Action', title: 'Open settings', run: run(props.onOpenSettings) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [props.onInvite]);

  const people = useMemo(() => {
    const map = new Map<string, { member: Member; boardId: string; count: number }>();
    boards.forEach(b => (b.members || []).forEach(m => {
      const key = (m.email || m.name).toLowerCase();
      const prev = map.get(key);
      map.set(key, { member: prev?.member || m, boardId: prev?.boardId || b.id, count: (prev?.count || 0) + 1 });
    }));
    return Array.from(map.values());
  }, [boards]);

  const rows: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: Row[] = [];
    const want = (s: Scope) => scope === 'all' || scope === s;

    if (!q) {
      if (want('actions')) out.push(...actions);
      if (scope === 'all') {
        getRecent().forEach(r => {
          if (r.type === 'project') {
            const b = boards.find(x => x.id === r.id);
            if (b) out.push({ key: `r-${r.id}`, group: 'Recent', kind: b.type === 'roadmap' ? 'Roadmap' : 'Project', title: b.name, meta: timeAgo(new Date(r.time).toISOString()), run: run(() => props.onSelectBoard(b.id)) });
          } else {
            const c = cards.find(x => x.card.id === r.id);
            if (c) out.push({ key: `r-${r.id}`, group: 'Recent', kind: 'Task', title: c.card.title, meta: `${c.board.name} · ${timeAgo(new Date(r.time).toISOString())}`, run: run(() => props.onOpenCard(c.card.id, c.board.id)) });
          }
        });
      }
      if (scope === 'projects') boards.forEach(b => out.push({ key: `p-${b.id}`, group: 'Projects', kind: b.type === 'roadmap' ? 'Roadmap' : 'Project', title: b.name, run: run(() => props.onSelectBoard(b.id)) }));
      if (scope === 'people') people.forEach(p => out.push({ key: `u-${p.member.id}`, group: 'People', kind: 'Person', title: p.member.name, meta: p.member.email, avatar: p.member, run: run(() => props.onSelectPerson(p.boardId, p.member.id)) }));
      if (scope === 'tasks') cards.filter(c => !c.card.completed).slice(0, 30).forEach(c => out.push({ key: `t-${c.card.id}`, group: 'Open tasks', kind: 'Task', title: c.card.title, meta: `${c.board.name} · ${c.columnName}`, run: run(() => props.onOpenCard(c.card.id, c.board.id)) }));
      return out;
    }

    if (want('actions')) out.push(...actions.filter(a => a.title.toLowerCase().includes(q)));
    if (want('projects')) boards.filter(b => b.name.toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q)).forEach(b =>
      out.push({ key: `p-${b.id}`, group: 'Projects', kind: b.type === 'roadmap' ? 'Roadmap' : 'Project', title: b.name, meta: `${b.columns?.reduce((n, c) => n + (c.cards?.length || 0), 0) || 0} tasks`, run: run(() => props.onSelectBoard(b.id)) }));
    if (want('tasks')) cards.filter(c => c.card.title.toLowerCase().includes(q) || (c.card.description || '').toLowerCase().includes(q)).slice(0, 40).forEach(c =>
      out.push({ key: `t-${c.card.id}`, group: 'Tasks', kind: c.card.completed ? 'Done' : 'Task', title: c.card.title, meta: `${c.board.name} · ${c.columnName}`, run: run(() => props.onOpenCard(c.card.id, c.board.id)) }));
    if (want('people')) people.filter(p => p.member.name.toLowerCase().includes(q) || (p.member.email || '').toLowerCase().includes(q)).forEach(p =>
      out.push({ key: `u-${p.member.id}`, group: 'People', kind: 'Person', title: p.member.name, meta: `${p.member.email} · ${p.count} ${p.count === 1 ? 'project' : 'projects'}`, avatar: p.member, run: run(() => props.onSelectPerson(p.boardId, p.member.id)) }));
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, scope, actions, boards, cards, people]);

  useEffect(() => { setCursor(0); }, [query, scope]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(rows.length - 1, c + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(0, c - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); rows[cursor]?.run(); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      const order: Scope[] = ['all', 'projects', 'tasks', 'people', 'actions'];
      setScope(s => order[(order.indexOf(s) + (e.shiftKey ? order.length - 1 : 1)) % order.length]);
    }
  };

  let index = -1;
  let lastGroup = '';

  return (
    <motion.div
      className="wp-palette-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
    >
      <motion.div
        className="wp-palette"
        initial={{ opacity: 0, y: -12, scale: 0.97, filter: 'blur(4px)' }}
        animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, scale: 0.98, filter: 'blur(3px)' }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        onKeyDown={onKey}
        role="dialog"
        aria-label="Command palette"
      >
        <div className="wp-palette-input">
          <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search projects, tasks, people — or type a command" />
          <kbd className="wp-kbd">Esc</kbd>
        </div>
        <div className="wp-palette-scopes">
          {(['all', 'projects', 'tasks', 'people', 'actions'] as const).map(s => (
            <button key={s} type="button" className={`wp-chip${scope === s ? ' on' : ''}`} onClick={() => setScope(s)}>
              {s === 'all' ? 'Everything' : s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <div className="wp-palette-list" ref={listRef}>
          {rows.length === 0 && <div className="wp-palette-empty">No matches for “{query}”.</div>}
          {rows.map(row => {
            index++;
            const i = index;
            const head = row.group !== lastGroup ? row.group : null;
            lastGroup = row.group;
            return (
              <React.Fragment key={row.key}>
                {head && <div className="wp-palette-group">{head}</div>}
                <button
                  type="button"
                  data-index={i}
                  className={`wp-palette-row${i === cursor ? ' active' : ''}`}
                  onMouseMove={() => setCursor(i)}
                  onClick={row.run}
                >
                  {row.avatar ? <MemberAvatar member={row.avatar} size={22} ring={false} /> : <span className="wp-palette-kind">{row.kind}</span>}
                  <span className="wp-palette-title">{row.title}</span>
                  {row.meta && <span className="wp-palette-meta">{row.meta}</span>}
                  <span className="wp-palette-enter">↵</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="wp-palette-foot">
          <span><kbd className="wp-kbd">↑</kbd><kbd className="wp-kbd">↓</kbd> Navigate</span>
          <span><kbd className="wp-kbd">↵</kbd> Open</span>
          <span><kbd className="wp-kbd">Tab</kbd> Filter</span>
        </div>
      </motion.div>
    </motion.div>
  );
}
