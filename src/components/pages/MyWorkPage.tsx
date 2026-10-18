import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useWorkStore } from '../../store/useWorkStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { LABELS } from '../../types';
import { useWorkspace, toDate, dayDiff, type CardMeta } from '../../lib/workspace';
import { Eyebrow, EmptyState, MemberAvatar } from '../wp/primitives';
import { relativeDay } from './TodayPage';

interface Props {
  onOpenCard: (cardId: string, boardId?: string) => void;
  onNewTask: () => void;
}

type Scope = 'mine' | 'all';
type Filter = 'open' | 'completed';

const BUCKETS = ['Overdue', 'Today', 'This week', 'Later', 'No due date'] as const;
type Bucket = typeof BUCKETS[number];

function bucketOf(item: CardMeta): Bucket {
  if (!item.card.dueDate) return 'No due date';
  const diff = dayDiff(toDate(item.card.dueDate), new Date());
  if (diff < 0) return 'Overdue';
  if (diff === 0) return 'Today';
  if (diff < 7) return 'This week';
  return 'Later';
}

export default function MyWorkPage({ onOpenCard, onNewTask }: Props) {
  const { cards, myCards } = useWorkspace();
  const toggleCardComplete = useWorkStore(s => s.toggleCardComplete);
  const customLabels = useSettingsStore(s => s.customLabels);
  const allLabels = useMemo(() => [...LABELS, ...customLabels], [customLabels]);

  const [scope, setScope] = useState<Scope>(() => (myCards.length ? 'mine' : 'all'));
  const [filter, setFilter] = useState<Filter>('open');

  const source = scope === 'mine' ? myCards : cards;
  const list = useMemo(
    () => source.filter(c => (filter === 'completed' ? c.card.completed : !c.card.completed)),
    [source, filter]
  );

  const groups = useMemo(() => {
    if (filter === 'completed') {
      const sorted = list.slice().sort((a, b) => (b.card.completedAt || '').localeCompare(a.card.completedAt || ''));
      return [{ bucket: 'Completed', items: sorted }];
    }
    return BUCKETS.map(bucket => ({
      bucket,
      items: list
        .filter(i => bucketOf(i) === bucket)
        .sort((a, b) => (a.card.dueDate || '').localeCompare(b.card.dueDate || '')),
    })).filter(g => g.items.length);
  }, [list, filter]);

  const openMine = myCards.filter(c => !c.card.completed).length;
  const openAll = cards.filter(c => !c.card.completed).length;

  return (
    <div className="wp-page">
      <div className="wp-page-inner">
        <header className="wp-hero compact">
          <div>
            <h1 className="wp-display md">My work.</h1>
            <p className="wp-lede">Everything on your plate across every project, ordered by when it’s due.</p>
          </div>
          <button type="button" className="wp-btn wp-btn-outline lg" onClick={onNewTask}>
            New task
          </button>
        </header>

        <div className="wp-toolbar">
          <div className="wp-tabs">
            <button type="button" className={`wp-tab${scope === 'mine' ? ' active' : ''}`} onClick={() => setScope('mine')}>
              Assigned to me <span className="wp-count">{openMine}</span>
            </button>
            <button type="button" className={`wp-tab${scope === 'all' ? ' active' : ''}`} onClick={() => setScope('all')}>
              All tasks <span className="wp-count">{openAll}</span>
            </button>
          </div>
          <div className="wp-segmented">
            <button type="button" className={filter === 'open' ? 'active' : ''} onClick={() => setFilter('open')}>Open</button>
            <button type="button" className={filter === 'completed' ? 'active' : ''} onClick={() => setFilter('completed')}>Completed</button>
          </div>
        </div>

        {groups.length === 0 ? (
          <EmptyState
            title={filter === 'completed' ? 'Nothing completed yet' : 'You’re all caught up'}
            body={scope === 'mine' ? 'Tasks assigned to you will appear here.' : 'Tasks from every project will appear here.'}
            action={filter === 'open' ? <button type="button" className="wp-btn wp-btn-primary" onClick={onNewTask}>New task</button> : undefined}
          />
        ) : (
          groups.map((g, gi) => (
            <motion.section
              key={g.bucket}
              className="wp-task-group"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.04, duration: 0.3 }}
            >
              <div className="wp-task-group-head">
                <Eyebrow style={g.bucket === 'Overdue' ? { color: 'hsl(var(--destructive))' } : undefined}>{g.bucket}</Eyebrow>
                <span className="wp-muted-sm">{g.items.length}</span>
              </div>
              <div className="wp-task-list">
                {g.items.map(item => {
                  const { card, board, columnName } = item;
                  const assignees = (card.assignees || [])
                    .map(id => board.members?.find(m => m.id === id))
                    .filter(Boolean) as NonNullable<typeof board.members>;
                  const overdue = !card.completed && card.dueDate && dayDiff(toDate(card.dueDate), new Date()) < 0;
                  return (
                    <div key={card.id} className={`wp-task-row${card.completed ? ' done' : ''}`}>
                      <button
                        type="button"
                        className={`wp-check${card.completed ? ' checked' : ''}`}
                        onClick={() => toggleCardComplete(card.id)}
                        aria-label={card.completed ? 'Mark as not done' : 'Mark as done'}
                      >
                        
                      </button>
                      <button type="button" className="wp-task-main" onClick={() => onOpenCard(card.id, board.id)}>
                        <span className="wp-task-title">{card.title}</span>
                        <span className="wp-task-meta">
                          <span className="wp-project-dot" style={{ backgroundColor: board.color }} />
                          {board.name}
                          <span className="wp-dot-sep" />
                          {columnName}
                          {(card.labels || []).slice(0, 3).map(l => {
                            const info = allLabels.find(x => x.id === l);
                            return (
                              <span key={l} className="wp-tag sm">
                                <span className="wp-tag-dot" style={{ backgroundColor: info?.color || 'hsl(var(--muted-foreground))' }} />
                                {info?.name || l}
                              </span>
                            );
                          })}
                        </span>
                      </button>
                      <span className="wp-task-assignees hide-on-mobile">
                        {assignees.slice(0, 3).map(m => <MemberAvatar key={m.id} member={m} size={22} />)}
                      </span>
                      <span className={`wp-task-due${overdue ? ' danger' : ''}`}>
                        {card.dueDate ? (<>{relativeDay(card.dueDate)}</>) : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          ))
        )}
      </div>
    </div>
  );
}
