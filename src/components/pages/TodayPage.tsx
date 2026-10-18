import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWorkStore } from '../../store/useWorkStore';
import { deriveCardProgress, sortMembersWithOwnerFirst } from '../../utils';
import {
  useWorkspace, useMyNotifications, projectStats, priorityScore, toDate, hasTime, dayDiff,
  formatShortDate, formatTime, timeAgo, projectMilestones, type CardMeta, type Milestone,
} from '../../lib/workspace';
import { AvatarStack, Eyebrow, ProgressBar, ProjectGlyph, Tag, EmptyState } from '../wp/primitives';
import heroImg from '../../assets/login-hero.jpg';

interface Props {
  onOpenCard: (cardId: string, boardId?: string) => void;
  onSelectBoard: (boardId: string) => void;
  onNewTask: () => void;
  onCreateBoard: () => void;
  onNavigate: (page: 'projects' | 'inbox' | 'mywork') => void;
}

const fade = {
  hidden: { opacity: 0, y: 10 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.35, ease: [0.25, 1, 0.5, 1] as const } }),
};

export function plainText(desc: string): string {
  return (desc || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function relativeDay(value: string): string {
  const d = toDate(value);
  const diff = dayDiff(d, new Date());
  const time = hasTime(value) ? formatTime(value) : '';
  if (diff === 0) return time || 'Today';
  if (diff === 1) return time ? `Tomorrow · ${time}` : 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)} days overdue`;
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: 'long' }) + (time ? ` · ${time}` : '');
  return formatShortDate(value);
}

export default function TodayPage({ onOpenCard, onSelectBoard, onNewTask, onCreateBoard, onNavigate }: Props) {
  const { user, boards, cards, myCards } = useWorkspace();
  const notifications = useMyNotifications();
  const toggleCardComplete = useWorkStore(s => s.toggleCardComplete);

  const pool = useMemo(() => {
    const mine = myCards.filter(c => !c.card.completed);
    return mine.length ? mine : cards.filter(c => !c.card.completed);
  }, [cards, myCards]);

  const priority: CardMeta | undefined = useMemo(
    () => pool.slice().sort((a, b) => priorityScore(b) - priorityScore(a))[0],
    [pool]
  );

  const upNext = useMemo(() => {
    const now = new Date();
    return pool
      .filter(c => c.card.dueDate && c.card.id !== priority?.card.id && dayDiff(toDate(c.card.dueDate), now) >= 0)
      .sort((a, b) => toDate(a.card.dueDate!).getTime() - toDate(b.card.dueDate!).getTime())
      .slice(0, 4);
  }, [pool, priority]);

  const inMotion = useMemo(() => {
    return boards
      .map(b => ({ board: b, stats: projectStats(b) }))
      .sort((a, b) => {
        const aActive = a.stats.progress < 100 ? 1 : 0;
        const bActive = b.stats.progress < 100 ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return (b.stats.total - b.stats.done) - (a.stats.total - a.stats.done);
      })
      .slice(0, 5);
  }, [boards]);

  const upcomingMilestones = useMemo(() => {
    const list: Array<{ m: Milestone; board: typeof boards[number] }> = [];
    boards.forEach(b => {
      const { items, fromTasks } = projectMilestones(b);
      if (fromTasks) items.filter(m => m.status !== 'completed').forEach(m => list.push({ m, board: b }));
    });
    return list.sort((a, z) => (a.m.date || '9999').localeCompare(z.m.date || '9999'));
  }, [boards]);

  const nextMilestone = useMemo(() => {
    const first = upcomingMilestones[0];
    if (first) return { title: first.m.title, board: first.board, date: first.m.date, progress: first.m.progress, cardId: first.m.cardId };
    const project = inMotion.find(x => x.stats.progress < 100 && x.stats.total > 0);
    return project ? { title: project.board.name, board: project.board, date: project.stats.due, progress: project.stats.progress, cardId: undefined } : null;
  }, [upcomingMilestones, inMotion]);

  const dueToday = pool.filter(c => c.card.dueDate && dayDiff(toDate(c.card.dueDate), new Date()) === 0).length;
  const overdue = pool.filter(c => c.card.dueDate && dayDiff(toDate(c.card.dueDate), new Date()) < 0).length;
  const firstName = user?.name?.split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="wp-page">
      <div className="wp-page-inner">
        {/* Hero */}
        <motion.header className="wp-hero" variants={fade} initial="hidden" animate="show" custom={0}>
          <div>
            <h1 className="wp-display">Make progress.</h1>
            <p className="wp-lede">
              {greeting}{firstName ? `, ${firstName}` : ''}. Your priorities, projects, and next steps — in one place.
            </p>
            <div className="wp-hero-stats">
              <span><strong>{boards.length}</strong> active {boards.length === 1 ? 'project' : 'projects'}</span>
              <span className="wp-dot-sep" />
              <span><strong>{dueToday}</strong> due today</span>
              {overdue > 0 && (
                <>
                  <span className="wp-dot-sep" />
                  <span className="wp-text-danger"><strong>{overdue}</strong> overdue</span>
                </>
              )}
            </div>
          </div>
          <button type="button" className="wp-btn wp-btn-outline lg" onClick={onNewTask}>
            New task
          </button>
        </motion.header>

        {/* Next milestone */}
        {nextMilestone && (
          <motion.section className="wp-milestone-hero" variants={fade} initial="hidden" animate="show" custom={0.5}>
            <img src={heroImg} alt="" aria-hidden />
            <div className="wp-milestone-hero-body">
              <Eyebrow style={{ color: 'rgba(255,255,255,0.6)' }}>Your next milestone</Eyebrow>
              <h2>{nextMilestone.title}</h2>
              <p>{nextMilestone.cardId ? nextMilestone.board.name : (nextMilestone.board.description ? plainText(nextMilestone.board.description) : 'Keep the momentum — this project is next on your path.')}</p>
              <div className="wp-milestone-hero-progress">
                <ProgressBar value={nextMilestone.progress} />
                <span>{nextMilestone.progress}%</span>
                {nextMilestone.date && <span>Due {formatShortDate(nextMilestone.date)}</span>}
              </div>
              <div className="wp-milestone-hero-actions">
                {nextMilestone.cardId && (
                  <button type="button" className="wp-btn wp-btn-light" onClick={() => onOpenCard(nextMilestone.cardId!, nextMilestone.board.id)}>Open milestone →</button>
                )}
                <button type="button" className="wp-btn wp-btn-glass" onClick={() => onSelectBoard(nextMilestone.board.id)}>View project →</button>
              </div>
            </div>
          </motion.section>
        )}

        {/* Direction + Up next */}
        <div className="wp-today-grid">
          <motion.section variants={fade} initial="hidden" animate="show" custom={1}>
            <Eyebrow>Today’s direction</Eyebrow>
            <div className="wp-rule" />
            {priority ? (
              <PriorityCard
                item={priority}
                onFocus={() => onOpenCard(priority.card.id, priority.board.id)}
                onOpenProject={() => onSelectBoard(priority.board.id)}
                onComplete={() => toggleCardComplete(priority.card.id)}
              />
            ) : (
              <EmptyState
                title="Nothing on your path yet"
                body="Add a task to set today’s direction."
                action={<button type="button" className="wp-btn wp-btn-primary" onClick={onNewTask}>New task</button>}
              />
            )}
          </motion.section>

          <motion.aside className="wp-upnext" variants={fade} initial="hidden" animate="show" custom={2}>
            <Eyebrow>Up next</Eyebrow>
            <div className="wp-rule" />
            {upNext.length === 0 ? (
              <p className="wp-muted" style={{ padding: '12px 0' }}>No upcoming deadlines. Enjoy the clear road.</p>
            ) : (
              <ol className="wp-timeline-list">
                {upNext.map((item, i) => (
                  <li key={item.card.id} className={i === 0 ? 'first' : undefined}>
                    <button type="button" onClick={() => onOpenCard(item.card.id, item.board.id)}>
                      <span className="wp-tl-time">{relativeDay(item.card.dueDate!)}</span>
                      <span className="wp-tl-title">{item.card.title}</span>
                      <span className="wp-tl-meta">{item.board.name} <span className="wp-dot-sep" /> {item.columnName}</span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </motion.aside>
        </div>

        {/* Upcoming milestones */}
        {upcomingMilestones.length > 0 && (
          <motion.section className="wp-section" variants={fade} initial="hidden" animate="show" custom={2.5}>
            <div className="wp-section-head">
              <div>
                <Eyebrow>Milestones, not just tasks</Eyebrow>
                <h2 className="wp-h2">Upcoming milestones</h2>
              </div>
            </div>
            <ul className="wp-milestone-rows">
              {upcomingMilestones.slice(0, 5).map(({ m, board }) => (
                <li key={m.id} className={m.status}>
                  <button type="button" onClick={() => m.cardId && onOpenCard(m.cardId, board.id)}>
                    <span className={`wp-ms-mark ${m.status}`} />
                    <span className="wp-ms-title">{m.title} <em>· {board.name}</em></span>
                    <span className="wp-ms-date">{m.date ? formatShortDate(m.date) : '—'}</span>
                    <span className="wp-ms-status">{m.progress}%</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.section>
        )}

        {/* In motion */}
        <motion.section className="wp-section" variants={fade} initial="hidden" animate="show" custom={3}>
          <div className="wp-section-head">
            <div>
              <Eyebrow>Project overview</Eyebrow>
              <h2 className="wp-h2">In motion</h2>
            </div>
            {boards.length > 0 && (
              <button type="button" className="wp-link" onClick={() => onNavigate('projects')}>
                All projects               </button>
            )}
          </div>
          {inMotion.length === 0 ? (
            <EmptyState
              title="No projects yet"
              body="Projects hold your boards and roadmaps. Start one to see it move here."
              action={<button type="button" className="wp-btn wp-btn-primary" onClick={onCreateBoard}>New project</button>}
            />
          ) : (
            <div className="wp-motion-list">
              {inMotion.map(({ board, stats }) => (
                <button key={board.id} type="button" className="wp-motion-row" onClick={() => onSelectBoard(board.id)}>
                  <ProjectGlyph id={board.id} />
                  <span className="wp-motion-main">
                    <span className="wp-motion-title">{board.name}</span>
                    <span className="wp-motion-desc">
                      {board.description ? plainText(board.description) : `${stats.total} ${stats.total === 1 ? 'task' : 'tasks'} across ${board.columns?.length || 0} ${board.type === 'roadmap' ? 'phases' : 'columns'}`}
                    </span>
                    <Tag>{board.type === 'roadmap' ? 'Roadmap' : 'Board'}</Tag>
                  </span>
                  <span className="wp-motion-col hide-on-mobile">
                    <Eyebrow>Owners</Eyebrow>
                    <AvatarStack members={sortMembersWithOwnerFirst(board.members || [], board.createdBy)} />
                  </span>
                  <span className="wp-motion-col wp-motion-progress">
                    <Eyebrow>Progress</Eyebrow>
                    <span className="wp-motion-progress-row">
                      <ProgressBar value={stats.progress} />
                      <span className="wp-num">{stats.progress}%</span>
                    </span>
                  </span>
                  <span className="wp-motion-due hide-on-mobile">
                                        {stats.due ? `Due ${formatShortDate(stats.due)}` : stats.total && stats.progress === 100 ? 'Complete' : 'No due date'}
                  </span>
                  <span className="wp-motion-chevron">→</span>
                </button>
              ))}
            </div>
          )}
        </motion.section>

        {/* Recent signals */}
        <motion.section className="wp-signals" variants={fade} initial="hidden" animate="show" custom={4}>
          <div className="wp-signals-head">
            <Eyebrow>Recent signals</Eyebrow>
            <button type="button" className="wp-link sm" onClick={() => onNavigate('inbox')}>
              View all activity             </button>
          </div>
          {notifications.length === 0 ? (
            <p className="wp-muted">Quiet for now — comments, assignments and deadlines will show up here.</p>
          ) : (
            <ul className="wp-signal-list">
              {notifications.slice(0, 3).map(n => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => n.cardId && onOpenCard(n.cardId, n.boardId || undefined)}
                    disabled={!n.cardId}
                  >
                    <span className="wp-signal-dot" />
                    <strong>{n.title}</strong>
                    <span className="wp-signal-sub">{n.sub}</span>
                    <span className="wp-dot-sep" />
                    <span className="wp-signal-time">{timeAgo(n.time)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </motion.section>
      </div>
    </div>
  );
}

function PriorityCard({ item, onFocus, onOpenProject, onComplete }: {
  item: CardMeta;
  onFocus: () => void;
  onOpenProject: () => void;
  onComplete: () => void;
}) {
  const { card, board, columnName } = item;
  const progress = deriveCardProgress(card, columnName);
  const desc = plainText(card.description);
  const overdue = card.dueDate && dayDiff(toDate(card.dueDate), new Date()) < 0;

  return (
    <div className="wp-priority">
      <div className="wp-priority-icon" aria-hidden>
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <circle cx="13" cy="13" r="11" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="13" cy="13" r="6" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="13" cy="13" r="2" fill="currentColor" />
        </svg>
      </div>
      <div className="wp-priority-body">
        <div className="wp-priority-top">
          <Eyebrow>Priority task</Eyebrow>
          {card.dueDate && (
            <span className={`wp-priority-due${overdue ? ' danger' : ''}`}>
                            {overdue ? `Overdue · ${formatShortDate(card.dueDate)}` : `Due ${formatShortDate(card.dueDate)}`}
            </span>
          )}
        </div>
        <h3 className="wp-priority-title">{card.title}</h3>
        {desc && <p className="wp-priority-desc">{desc.length > 180 ? `${desc.slice(0, 180)}…` : desc}</p>}
        <div className="wp-priority-foot">
          <div className="wp-priority-meta">
            <button type="button" className="wp-tag wp-tag-btn" onClick={onOpenProject}>
              {board.name}
            </button>
            <div className="wp-priority-progress">
              <ProgressBar value={progress} />
              <span className="wp-muted-sm">{progress}% · {columnName}</span>
            </div>
          </div>
          <div className="wp-priority-actions">
            <button type="button" className="wp-btn wp-btn-ghost" onClick={onComplete} title="Mark as done">
              Done
            </button>
            <button type="button" className="wp-btn wp-btn-primary" onClick={onFocus}>
              Focus this task             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
