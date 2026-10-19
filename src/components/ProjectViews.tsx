import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Board } from '../types';
import { formatBytes, sortMembersWithOwnerFirst } from '../utils';
import {
  projectMilestones, projectStats, projectHealth, formatShortDate, timeAgo, type Milestone,
} from '../lib/workspace';
import { AvatarStack, Eyebrow, EmptyState } from './wp/primitives';
import heroImg from '../assets/login-hero.jpg';
import { LearnChevron, NumberPop } from './ui/transitions';
import { Plus, Kanban, Milestone as MilestoneIcon, FileText, Path, UserPlus } from './ui/icons';

const STATUS_LABEL = { completed: 'Completed', current: 'In progress', upcoming: 'Upcoming' } as const;

/* ── Journey stepper ────────────────────────────────────── */
export function MilestoneStepper({ board, onOpenCard }: { board: Board; onOpenCard: (cardId: string) => void }) {
  const { items } = projectMilestones(board);
  if (!items.length) return null;
  const shown = items.slice(0, 6);
  return (
    <ol className="wp-stepper" style={{ ['--steps' as string]: shown.length } as React.CSSProperties}>
      {shown.map(m => (
        <li key={m.id} className={`wp-step ${m.status}`}>
          <span className="wp-step-node" />
          <button type="button" className="wp-step-label" onClick={() => m.cardId && onOpenCard(m.cardId)} disabled={!m.cardId}>
            <span className="wp-step-title">{m.title}</span>
            <span className="wp-step-sub">{STATUS_LABEL[m.status]}{m.date ? ` · ${formatShortDate(m.date)}` : ''}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

/* ── Progress ring ──────────────────────────────────────── */
function Ring({ value, size = 104 }: { value: number; size?: number }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="wp-ring" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--foreground) / 0.1)" strokeWidth="3" />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--foreground))" strokeWidth="3" strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c * (1 - value / 100) }}
        transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="wp-ring-text">{value}%</text>
    </svg>
  );
}

/* ── Overview ───────────────────────────────────────────── */
interface OverviewProps {
  board: Board;
  onOpenCard: (cardId: string) => void;
  onAddTask: () => void;
  onShowTab: (tab: ProjectTab) => void;
  onInvite: () => void;
  onOpenTimeline: () => void;
  editable: boolean;
}

export type ProjectTab = 'overview' | 'milestones' | 'tasks' | 'calendar' | 'files' | 'activity';

export function OverviewTab({ board, onOpenCard, onAddTask, onShowTab, onInvite, onOpenTimeline, editable }: OverviewProps) {
  const stats = projectStats(board);
  const { items, fromTasks } = projectMilestones(board);
  const health = projectHealth(board);
  const members = sortMembersWithOwnerFirst(board.members || [], board.createdBy);
  const owner = members.find(m => m.role === 'owner') || members.find(m => m.email && board.createdBy && m.email.toLowerCase() === board.createdBy.toLowerCase()) || members[0];
  const doneMilestones = items.filter(m => m.status === 'completed').length;

  return (
    <div className="wp-overview">
      <div className="wp-overview-top">
        <div className="wp-overview-cover">
          <img src={heroImg} alt="" />
          <div className="wp-overview-cover-text">
            <Eyebrow style={{ color: 'rgba(255,255,255,0.65)' }}>{board.type === 'roadmap' ? 'Roadmap' : 'Project'}</Eyebrow>
            <span>{board.name}</span>
          </div>
        </div>

        <section className="wp-panel">
          <Eyebrow>Project details</Eyebrow>
          <dl className="wp-details">
            <dt>Owner</dt><dd>{owner?.name || '—'}</dd>
            <dt>Team</dt><dd><AvatarStack members={members} size={20} max={5} /></dd>
            <dt>Start date</dt><dd>{stats.start ? formatShortDate(stats.start) : '—'}</dd>
            <dt>End date</dt><dd>{stats.end ? formatShortDate(stats.end) : '—'}</dd>
            <dt>Status</dt><dd className={`wp-health ${health === 'At risk' ? 'risk' : ''}`}>{health}</dd>
          </dl>
        </section>

        <section className="wp-panel wp-panel-progress">
          <Eyebrow>Project progress</Eyebrow>
          <Ring value={stats.progress} />
          <div className="wp-panel-progress-text">
            <strong>{health}</strong>
            <span>{fromTasks
              ? <><NumberPop value={doneMilestones} /> of <NumberPop value={items.length} /> milestones complete</>
              : <><NumberPop value={stats.done} /> of <NumberPop value={stats.total} /> tasks complete</>}</span>
          </div>
        </section>
      </div>

      <div className="wp-overview-bottom">
        <section>
          <div className="wp-section-head compact">
            <Eyebrow>{fromTasks ? 'Key milestones' : 'Stages'}</Eyebrow>
            <button type="button" className="wp-link sm t-learn" onClick={() => onShowTab('milestones')}>View all <LearnChevron size={13} /></button>
          </div>
          <MilestoneRows items={items.slice(0, 5)} onOpenCard={onOpenCard} />
          {!fromTasks && (
            <p className="wp-muted-sm wp-hint">Tip: open any task and tick “Mark as a milestone” to build this project’s journey.</p>
          )}
        </section>

        <section className="wp-panel">
          <Eyebrow>Quick actions</Eyebrow>
          <div className="wp-quick-actions">
            {editable && <button type="button" className="t-learn" onClick={onAddTask}><Plus size={17} /> Add task <span className="wp-qa-arrow"><LearnChevron size={14} /></span></button>}
            <button type="button" className="t-learn" onClick={() => onShowTab('tasks')}>{board.type === 'roadmap' ? <MilestoneIcon size={17} /> : <Kanban size={17} />} Open {board.type === 'roadmap' ? 'roadmap' : 'board'} <span className="wp-qa-arrow"><LearnChevron size={14} /></span></button>
            <button type="button" className="t-learn" onClick={() => onShowTab('files')}><FileText size={17} /> Browse files <span className="wp-qa-arrow"><LearnChevron size={14} /></span></button>
            <button type="button" className="t-learn" onClick={onOpenTimeline}><Path size={17} /> View timeline <span className="wp-qa-arrow"><LearnChevron size={14} /></span></button>
            <button type="button" className="t-learn" onClick={onInvite}><UserPlus size={17} /> Invite members <span className="wp-qa-arrow"><LearnChevron size={14} /></span></button>
          </div>
        </section>
      </div>
    </div>
  );
}

function MilestoneRows({ items, onOpenCard }: { items: Milestone[]; onOpenCard: (id: string) => void }) {
  if (!items.length) return <p className="wp-muted">No milestones yet.</p>;
  return (
    <ul className="wp-milestone-rows">
      {items.map(m => (
        <li key={m.id} className={m.status}>
          <button type="button" onClick={() => m.cardId && onOpenCard(m.cardId)} disabled={!m.cardId}>
            <span className={`wp-ms-mark ${m.status}`} />
            <span className="wp-ms-title">{m.title}{m.taskCount !== undefined ? <em> · {m.taskCount} tasks</em> : null}</span>
            <span className="wp-ms-date">{m.date ? formatShortDate(m.date) : '—'}</span>
            <span className="wp-ms-status">{STATUS_LABEL[m.status]}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/* ── Milestones tab ─────────────────────────────────────── */
export function MilestonesTab({ board, onOpenCard }: { board: Board; onOpenCard: (cardId: string) => void }) {
  const { items, fromTasks } = projectMilestones(board);
  return (
    <div className="wp-tab-page">
      {!fromTasks && (
        <div className="wp-callout">
          <strong>Milestones, not just tasks.</strong> This project has no milestones yet, so its workflow stages are shown. Open a task and mark it as a milestone to chart the journey.
        </div>
      )}
      {items.length === 0 ? <EmptyState title="No milestones yet" /> : (
        <ul className="wp-ms-cards">
          {items.map((m, i) => (
            <li key={m.id} className={m.status}>
              <span className="wp-ms-index">{String(i + 1).padStart(2, '0')}</span>
              <button type="button" className="wp-ms-card-main" onClick={() => m.cardId && onOpenCard(m.cardId)} disabled={!m.cardId}>
                <span className="wp-ms-card-title">{m.title}</span>
                <span className="wp-muted-sm">{STATUS_LABEL[m.status]}{m.date ? ` · ${formatShortDate(m.date)}` : ''}{m.taskCount !== undefined ? ` · ${m.taskCount} tasks` : ''}</span>
              </button>
              <div className="wp-ms-card-progress">
                <div className="wp-progress" style={{ height: 3 }}><div className="wp-progress-fill" style={{ width: `${m.progress}%` }} /></div>
                <span className="wp-num"><NumberPop value={m.progress} />%</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Files tab ──────────────────────────────────────────── */
export function FilesTab({ board, onOpenCard }: { board: Board; onOpenCard: (cardId: string) => void }) {
  const files = useMemo(() => {
    const out: Array<{ id: string; name: string; size: number; addedAt: string; dataUrl: string; cardId: string; cardTitle: string }> = [];
    [...(board.columns || []).flatMap(c => c.cards || []), ...(board.inboxCards || [])].forEach(card => {
      (card.attachments || []).forEach(a => out.push({ ...a, cardId: card.id, cardTitle: card.title }));
      (card.comments || []).forEach(cm => (cm.attachments || []).forEach(a => out.push({ ...a, cardId: card.id, cardTitle: card.title })));
    });
    return out.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
  }, [board]);

  if (!files.length) return <div className="wp-tab-page"><EmptyState title="No files yet" body="Files attached to tasks and comments in this project collect here." /></div>;
  return (
    <div className="wp-tab-page">
      <table className="wp-table">
        <thead><tr><th>Name</th><th>Task</th><th>Size</th><th>Added</th></tr></thead>
        <tbody>
          {files.map(f => (
            <tr key={`${f.cardId}-${f.id}`}>
              <td><a href={f.dataUrl} download={f.name} target="_blank" rel="noreferrer">{f.name}</a></td>
              <td><button type="button" className="wp-link sm" onClick={() => onOpenCard(f.cardId)}>{f.cardTitle}</button></td>
              <td className="wp-muted-sm">{formatBytes(f.size)}</td>
              <td className="wp-muted-sm">{f.addedAt ? timeAgo(f.addedAt) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Activity tab ───────────────────────────────────────── */
export function ActivityTab({ board, onOpenCard }: { board: Board; onOpenCard: (cardId: string) => void }) {
  const events = useMemo(() => {
    const out: Array<{ time: string; who: string; what: string; cardId: string; cardTitle: string }> = [];
    (board.columns || []).forEach(col => (col.cards || []).forEach(card => {
      out.push({ time: card.createdAt, who: '', what: `Task added to ${col.name}`, cardId: card.id, cardTitle: card.title });
      if (card.completedAt) out.push({ time: card.completedAt, who: '', what: 'Completed', cardId: card.id, cardTitle: card.title });
      (card.comments || []).forEach(c => out.push({ time: c.createdAt, who: c.author, what: c.parentId ? 'replied on' : 'commented on', cardId: card.id, cardTitle: card.title }));
      (card.attachments || []).forEach(a => out.push({ time: a.addedAt, who: '', what: `File “${a.name}” added to`, cardId: card.id, cardTitle: card.title }));
    }));
    return out.filter(e => e.time).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 80);
  }, [board]);

  if (!events.length) return <div className="wp-tab-page"><EmptyState title="No activity yet" /></div>;
  return (
    <div className="wp-tab-page narrow">
      <ol className="wp-feed">
        {events.map((e, i) => (
          <li key={i}>
            <span className="wp-feed-time">{timeAgo(e.time)}</span>
            <span className="wp-feed-text">
              {e.who && <strong>{e.who} </strong>}
              {e.what}{' '}
              <button type="button" className="wp-link sm inline" onClick={() => onOpenCard(e.cardId)}>{e.cardTitle}</button>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
