import React, { useMemo, useState } from 'react';
import { useIsMobile } from '../../utils';
import { useWorkspace, toDate, startOfDay, dayDiff, formatShortDate, type CardMeta } from '../../lib/workspace';
import type { Board } from '../../types';
import { EmptyState } from '../wp/primitives';

interface Props {
  onOpenCard: (cardId: string, boardId?: string) => void;
  onSelectBoard: (boardId: string) => void;
}

const DAYS = 84;

interface Span { start: Date; end: Date }

function spanOf(item: CardMeta): Span | null {
  const s = item.card.startDate || item.card.dueDate;
  const e = item.card.dueDate || item.card.startDate;
  if (!s || !e) return null;
  const start = startOfDay(toDate(s));
  const end = startOfDay(toDate(e));
  return start <= end ? { start, end } : { start: end, end: start };
}

export default function TimelinePage({ onOpenCard, onSelectBoard }: Props) {
  const { boards, cards } = useWorkspace();
  const isMobile = useIsMobile(860);
  const dayW = isMobile ? 10 : 15;

  const [offset, setOffset] = useState(0);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const today = startOfDay(new Date());
  const windowStart = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 14 + offset * 28);
    // align to Monday
    const dow = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - dow);
    return d;
  }, [offset, today.getTime()]);

  const rows = useMemo(() => {
    const byBoard = new Map<string, { board: Board; tasks: Array<{ item: CardMeta; span: Span }> }>();
    cards.forEach(item => {
      const span = spanOf(item);
      if (!span) return;
      if (!byBoard.has(item.board.id)) byBoard.set(item.board.id, { board: item.board, tasks: [] });
      byBoard.get(item.board.id)!.tasks.push({ item, span });
    });
    return boards
      .filter(b => byBoard.has(b.id))
      .map(b => {
        const entry = byBoard.get(b.id)!;
        entry.tasks.sort((a, z) => a.span.start.getTime() - z.span.start.getTime());
        const start = entry.tasks[0].span.start;
        const end = entry.tasks.reduce((m, t) => (t.span.end > m ? t.span.end : m), entry.tasks[0].span.end);
        return { ...entry, span: { start, end } };
      });
  }, [boards, cards]);

  const weeks = Array.from({ length: DAYS / 7 }, (_, i) => {
    const d = new Date(windowStart);
    d.setDate(d.getDate() + i * 7);
    return d;
  });

  const place = (span: Span) => {
    const left = dayDiff(span.start, windowStart);
    const width = dayDiff(span.end, span.start) + 1;
    const clampedLeft = Math.max(0, left);
    const clampedRight = Math.min(DAYS, left + width);
    if (clampedRight <= 0 || clampedLeft >= DAYS) return null;
    return { left: clampedLeft * dayW, width: Math.max(dayW * 0.6, (clampedRight - clampedLeft) * dayW), single: width === 1 };
  };

  const todayX = dayDiff(today, windowStart) * dayW + dayW / 2;
  const rangeLabel = `${windowStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${weeks[weeks.length - 1].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <div className="wp-page">
      <div className="wp-page-inner wide">
        <header className="wp-hero compact">
          <div>
            <h1 className="wp-display md">Timeline.</h1>
            <p className="wp-lede">See every project’s route at a glance — what’s scheduled, what overlaps, and what’s next.</p>
          </div>
          <div className="wp-timeline-nav">
            <button type="button" className="wp-icon-ghost bordered" onClick={() => setOffset(o => o - 1)} aria-label="Earlier">←</button>
            <button type="button" className="wp-btn wp-btn-ghost" onClick={() => setOffset(0)}>Today</button>
            <button type="button" className="wp-icon-ghost bordered" onClick={() => setOffset(o => o + 1)} aria-label="Later">→</button>
            <span className="wp-muted-sm hide-on-mobile" style={{ marginLeft: 6 }}>{rangeLabel}</span>
          </div>
        </header>

        {rows.length === 0 ? (
          <EmptyState title="Nothing scheduled yet" body="Give tasks a start or due date and they’ll appear on the timeline." />
        ) : (
          <div className="wp-gantt">
            <div className="wp-gantt-scroll">
              <div className="wp-gantt-grid" style={{ width: DAYS * dayW + (isMobile ? 150 : 260) }}>
                {/* Header */}
                <div className="wp-gantt-row head">
                  <div className="wp-gantt-label head">Project</div>
                  <div className="wp-gantt-track" style={{ width: DAYS * dayW }}>
                    {weeks.map((w, i) => (
                      <div key={i} className="wp-gantt-week" style={{ left: i * 7 * dayW, width: 7 * dayW }}>
                        {w.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    ))}
                  </div>
                </div>

                {rows.map(({ board, tasks, span }) => {
                  const open = !collapsed.has(board.id);
                  const pos = place(span);
                  return (
                    <React.Fragment key={board.id}>
                      <div className="wp-gantt-row project">
                        <div className="wp-gantt-label">
                          <button
                            type="button"
                            className="wp-gantt-toggle"
                            onClick={() => setCollapsed(prev => {
                              const next = new Set(prev);
                              if (next.has(board.id)) next.delete(board.id); else next.add(board.id);
                              return next;
                            })}
                            aria-label={open ? 'Collapse' : 'Expand'}
                          >
                            {open ? '−' : '+'}
                          </button>
                          <button type="button" className="wp-gantt-project" onClick={() => onSelectBoard(board.id)}>
                            <span className="wp-project-dot" style={{ backgroundColor: board.color }} />
                            <span className="wp-gantt-name">{board.name}</span>
                            {board.type === 'roadmap' && <span className="wp-muted-sm">Map</span>}
                          </button>
                        </div>
                        <div className="wp-gantt-track" style={{ width: DAYS * dayW }}>
                          <GridLines dayW={dayW} />
                          {pos && (
                            <div
                              className="wp-gantt-bar project"
                              style={{ left: pos.left, width: pos.width }}
                              title={`${formatShortDate(span.start.toISOString())} – ${formatShortDate(span.end.toISOString())}`}
                            >
                              <span />
                            </div>
                          )}
                          <div className="wp-gantt-today" style={{ left: todayX }} />
                        </div>
                      </div>
                      {open && tasks.map(({ item, span: s }) => {
                        const p = place(s);
                        return (
                          <div key={item.card.id} className="wp-gantt-row task">
                            <div className="wp-gantt-label">
                              <button type="button" className="wp-gantt-task" onClick={() => onOpenCard(item.card.id, board.id)} title={item.card.title}>
                                {item.card.title}
                              </button>
                            </div>
                            <div className="wp-gantt-track" style={{ width: DAYS * dayW }}>
                              <GridLines dayW={dayW} />
                              {p && (
                                <button
                                  type="button"
                                  className={`wp-gantt-bar task${item.card.completed ? ' done' : ''}${p.single ? ' single' : ''}`}
                                  style={{ left: p.left, width: p.single ? undefined : p.width }}
                                  onClick={() => onOpenCard(item.card.id, board.id)}
                                  title={`${item.card.title} · ${item.columnName}`}
                                >
                                  {!p.single && !isMobile && p.width > 80 && <span className="wp-gantt-bar-label">{item.card.title}</span>}
                                </button>
                              )}
                              <div className="wp-gantt-today" style={{ left: todayX }} />
                            </div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GridLines({ dayW }: { dayW: number }) {
  return (
    <div className="wp-gantt-lines" style={{ backgroundSize: `${dayW * 7}px 100%` }} />
  );
}
