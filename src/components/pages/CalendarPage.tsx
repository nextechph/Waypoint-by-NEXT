import React, { useMemo, useState } from 'react';
import { useWorkspace, toDate, hasTime, startOfDay, dayDiff, formatTime, type CardMeta } from '../../lib/workspace';
import { useIsMobile } from '../../utils';
import { ChevronLeft, ChevronRight } from '../ui/icons';

interface Props {
  onOpenCard: (cardId: string, boardId?: string) => void;
}

type Mode = 'week' | 'month';
const HOURS = Array.from({ length: 13 }, (_, i) => 8 + i); // 8 AM – 8 PM
const HOUR_H = 56;

function mondayOf(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function CalendarPage({ onOpenCard }: Props) {
  const { cards, myCards } = useWorkspace();
  const isMobile = useIsMobile(860);
  const [mode, setMode] = useState<Mode>(isMobile ? 'month' : 'week');
  const [mineOnly, setMineOnly] = useState(false);
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const today = startOfDay(new Date());

  const source = mineOnly ? myCards : cards;
  const dated = useMemo(() => source.filter(c => c.card.dueDate), [source]);
  const onDay = (day: Date) => dated.filter(c => dayDiff(toDate(c.card.dueDate!), day) === 0);

  const shift = (dir: number) => {
    const next = new Date(anchor);
    if (mode === 'week') next.setDate(next.getDate() + dir * 7);
    else next.setMonth(next.getMonth() + dir, 1);
    setAnchor(next);
  };

  const weekStart = mondayOf(anchor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = mondayOf(monthStart);
  const monthDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const title = mode === 'week'
    ? `${weekDays[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
    : anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="wp-page">
      <div className="wp-page-inner wide">
        <header className="wp-hero compact">
          <div>
            <h1 className="wp-display md">Calendar.</h1>
            <p className="wp-lede">Every deadline across your projects, laid out by day.</p>
          </div>
        </header>

        <div className="wp-toolbar">
          <div className="wp-cal-nav">
            <button type="button" className="wp-icon-ghost bordered" onClick={() => shift(-1)} aria-label="Previous"><ChevronLeft size={16} /></button>
            <button type="button" className="wp-btn wp-btn-ghost" onClick={() => setAnchor(startOfDay(new Date()))}>Today</button>
            <button type="button" className="wp-icon-ghost bordered" onClick={() => shift(1)} aria-label="Next"><ChevronRight size={16} /></button>
            <span className="wp-cal-title">{title}</span>
          </div>
          <div className="wp-toolbar-right">
            <div className="wp-segmented">
              <button type="button" className={!mineOnly ? 'active' : ''} onClick={() => setMineOnly(false)}>Everyone</button>
              <button type="button" className={mineOnly ? 'active' : ''} onClick={() => setMineOnly(true)}>Mine</button>
            </div>
            <div className="wp-segmented">
              <button type="button" className={mode === 'week' ? 'active' : ''} onClick={() => setMode('week')}>Week</button>
              <button type="button" className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')}>Month</button>
            </div>
          </div>
        </div>

        {mode === 'week' ? (
          <div className="wp-week">
            <div className="wp-week-head">
              <div />
              {weekDays.map(d => (
                <div key={d.toISOString()} className={`wp-week-day${dayDiff(d, today) === 0 ? ' today' : ''}`}>
                  <span>{d.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                  <strong>{d.getDate()}</strong>
                </div>
              ))}
            </div>
            <div className="wp-week-allday">
              <div className="wp-week-gutter">All day</div>
              {weekDays.map(d => (
                <div key={d.toISOString()} className="wp-week-allday-cell">
                  {onDay(d).filter(c => !hasTime(c.card.dueDate!)).map(c => <Event key={c.card.id} item={c} onOpen={onOpenCard} compact />)}
                </div>
              ))}
            </div>
            <div className="wp-week-grid" style={{ height: HOURS.length * HOUR_H }}>
              <div className="wp-week-hours">
                {HOURS.map(h => (
                  <div key={h} style={{ height: HOUR_H }}>{new Date(2000, 0, 1, h).toLocaleTimeString(undefined, { hour: 'numeric' })}</div>
                ))}
              </div>
              {weekDays.map(d => (
                <div key={d.toISOString()} className={`wp-week-col${dayDiff(d, today) === 0 ? ' today' : ''}`}>
                  {onDay(d).filter(c => hasTime(c.card.dueDate!)).map(c => {
                    const t = toDate(c.card.dueDate!);
                    const top = Math.max(0, Math.min(HOURS.length - 1, t.getHours() + t.getMinutes() / 60 - HOURS[0])) * HOUR_H;
                    return (
                      <div key={c.card.id} className="wp-week-slot" style={{ top }}>
                        <Event item={c} onOpen={onOpenCard} />
                      </div>
                    );
                  })}
                  {dayDiff(d, today) === 0 && (() => {
                    const now = new Date();
                    const pos = (now.getHours() + now.getMinutes() / 60 - HOURS[0]) * HOUR_H;
                    return pos >= 0 && pos <= HOURS.length * HOUR_H ? <div className="wp-now" style={{ top: pos }} /> : null;
                  })()}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="wp-month">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <div key={d} className="wp-month-dow">{d}</div>)}
            {monthDays.map(d => {
              const items = onDay(d);
              const outside = d.getMonth() !== anchor.getMonth();
              return (
                <div key={d.toISOString()} className={`wp-month-cell${outside ? ' outside' : ''}${dayDiff(d, today) === 0 ? ' today' : ''}`}>
                  <span className="wp-month-num">{d.getDate()}</span>
                  {items.slice(0, isMobile ? 1 : 3).map(c => <Event key={c.card.id} item={c} onOpen={onOpenCard} compact />)}
                  {items.length > (isMobile ? 1 : 3) && <span className="wp-month-more">+{items.length - (isMobile ? 1 : 3)} more</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Event({ item, onOpen, compact }: { item: CardMeta; onOpen: (cardId: string, boardId?: string) => void; compact?: boolean }) {
  const { card, board } = item;
  return (
    <button
      type="button"
      className={`wp-event${compact ? ' compact' : ''}${card.completed ? ' done' : ''}${card.isMilestone ? ' milestone' : ''}`}
      onClick={() => onOpen(card.id, board.id)}
      title={`${card.title} · ${board.name}`}
    >
      <span className="wp-event-title">{card.isMilestone ? '◆ ' : ''}{card.title}</span>
      {!compact && <span className="wp-event-meta">{hasTime(card.dueDate!) ? formatTime(card.dueDate!) : 'All day'} · {board.name}</span>}
    </button>
  );
}
