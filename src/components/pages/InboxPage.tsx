import React, { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNotifStore } from '../../store/useNotifStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkspace, useMyNotifications, markInboxSeen, timeAgo, dayDiff } from '../../lib/workspace';
import { EmptyState, Eyebrow } from '../wp/primitives';
import { revealItem } from '../../lib/motion';
import { RevealLines } from '../ui/transitions';
import { Clock, AlertTriangle, CheckCircle2, Bell, X, Check } from '../ui/icons';

interface Props {
  onOpenCard: (cardId: string, boardId?: string) => void;
}

const KIND: Record<string, { label: string; icon: typeof Bell }> = {
  clock: { label: 'Due soon', icon: Clock },
  alert: { label: 'Overdue', icon: AlertTriangle },
  check: { label: 'Update', icon: CheckCircle2 },
  bell: { label: 'Activity', icon: Bell },
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
          <RevealLines>
            <h1 className="wp-display md">Inbox.</h1>
            <p className="wp-lede">Assignments, mentions, comments and deadlines — the signals that need you.</p>
          </RevealLines>
          {notifications.length > 0 && (
            <button type="button" className="wp-btn wp-btn-ghost" onClick={() => clearAll(user?.email)}>
              <Check size={15} /> Clear all
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
              {...revealItem(gi)}
            >
              <div className="wp-task-group-head"><Eyebrow>{g.label}</Eyebrow></div>
              <div className="wp-inbox-list">
                {g.items.map(n => {
                  const board = boards.find(b => b.id === n.boardId);
                  return (
                    <div key={n.id} className={`wp-inbox-item tone-${n.icon}`}>
                      {(() => {
                        const kind = KIND[n.icon] || KIND.check;
                        const KindIcon = kind.icon;
                        return (
                          <span className="wp-inbox-kind">
                            <span className="wp-inbox-kind-icon"><KindIcon size={16} weight={n.icon === 'alert' ? 'fill' : 'regular'} /></span>
                            {kind.label}
                          </span>
                        );
                      })()}
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
                      <button type="button" className="wp-text-link" onClick={() => removeNotification(n.id)} aria-label="Dismiss" title="Dismiss">
                        <X size={14} />
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
