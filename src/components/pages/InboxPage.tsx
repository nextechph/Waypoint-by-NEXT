import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNotifStore } from '../../store/useNotifStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkspace, useMyNotifications, markInboxSeen, timeAgo, dayDiff } from '../../lib/workspace';
import { EmptyState, Eyebrow } from '../wp/primitives';

interface Props {
  onOpenCard: (cardId: string, boardId?: string) => void;
}

const KIND: Record<string, string> = {
  clock: 'Due soon',
  alert: 'Overdue',
  check: 'Update',
  bell: 'Activity',
};

export default function InboxPage({ onOpenCard }: Props) {
  const notifications = useMyNotifications();
  const removeNotification = useNotifStore(s => s.removeNotification);
  const clearAll = useNotifStore(s => s.clearAll);
  const user = useAuthStore(s => s.user);
  const { boards } = useWorkspace();

  useEffect(() => {
    markInboxSeen();
    return () => markInboxSeen();
  }, [notifications.length]);

  const groups = useMemo(() => {
    const out: Array<{ label: string; items: typeof notifications }> = [];
    notifications.forEach(n => {
      const diff = dayDiff(new Date(n.time), new Date());
      const label = diff === 0 ? 'Today' : diff === -1 ? 'Yesterday' : diff > -7 ? 'This week' : 'Earlier';
      const g = out.find(x => x.label === label);
      if (g) g.items.push(n); else out.push({ label, items: [n] });
    });
    return out;
  }, [notifications]);

  return (
    <div className="wp-page">
      <div className="wp-page-inner narrow">
        <header className="wp-hero compact">
          <div>
            <h1 className="wp-display md">Inbox.</h1>
            <p className="wp-lede">Assignments, mentions, comments and deadlines — the signals that need you.</p>
          </div>
          {notifications.length > 0 && (
            <button type="button" className="wp-btn wp-btn-ghost" onClick={() => clearAll(user?.email)}>
              Clear all
            </button>
          )}
        </header>

        {notifications.length === 0 ? (
          <EmptyState title="Inbox zero" body="You’re all caught up. New activity will land here." />
        ) : (
          groups.map((g, gi) => (
            <motion.section
              key={g.label}
              className="wp-task-group"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.04, duration: 0.3 }}
            >
              <div className="wp-task-group-head"><Eyebrow>{g.label}</Eyebrow></div>
              <div className="wp-inbox-list">
                {g.items.map(n => {
                  const board = boards.find(b => b.id === n.boardId);
                  return (
                    <div key={n.id} className={`wp-inbox-item tone-${n.icon}`}>
                      <span className="wp-inbox-kind">{KIND[n.icon] || 'Update'}</span>
                      <button
                        type="button"
                        className="wp-inbox-main"
                        onClick={() => n.cardId && onOpenCard(n.cardId, n.boardId || undefined)}
                        disabled={!n.cardId}
                      >
                        <span className="wp-inbox-title">{n.title}</span>
                        <span className="wp-inbox-sub">{n.sub}</span>
                        <span className="wp-inbox-meta">
                          {board && (<><span className="wp-project-dot" style={{ backgroundColor: board.color }} />{board.name}<span className="wp-dot-sep" /></>)}
                          {timeAgo(n.time)}
                        </span>
                      </button>
                      <button type="button" className="wp-text-link" onClick={() => removeNotification(n.id)} aria-label="Dismiss">
                        Dismiss
                      </button>
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
