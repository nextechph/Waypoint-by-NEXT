import React, { useState, useEffect, useRef } from 'react';
import {
  Calendar, MessageSquare, Paperclip,
  Square, CheckSquare,
  Lock, Smartphone, Settings, Code, Paintbrush,
  Zap, BookOpen, Globe, Database, ShieldCheck, Layers,
  ArrowRightLeft, Milestone
} from './ui/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { LABELS, type Card as CardType, type Member } from '../types';
import { getDueStatus, formatDueDate, avatarInitials, getColDotColor, getScheduleHealth } from '../utils';
import { useWorkStore } from '../store/useWorkStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useToastStore } from '../store/useToastStore';
import AvatarBorder from './ui/AvatarBorder';

interface Props {
  card: CardType;
  cardIndex: number;
  colId: string;
  accentColor: string;
  isUrgent?: boolean;
  cardDelay?: number;
  isObserver?: boolean;
  onClick: () => void;
  onToggleComplete: (e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

function getCardIcon(card: CardType): React.ReactNode {
  const labels = card.labels || [];
  const t = card.title.toLowerCase();
  if (labels.includes('bug'))      return <ShieldCheck size={14} />;
  if (labels.includes('design'))   return <Paintbrush size={14} />;
  if (labels.includes('backend'))  return <Database size={14} />;
  if (labels.includes('frontend')) return <Globe size={14} />;
  if (labels.includes('feature'))  return <Zap size={14} />;
  if (labels.includes('urgent'))   return <Zap size={14} />;
  if (t.includes('auth') || t.includes('login') || t.includes('password')) return <Lock size={14} />;
  if (t.includes('mobile') || t.includes('ios') || t.includes('android'))  return <Smartphone size={14} />;
  if (t.includes('api') || t.includes('backend') || t.includes('server'))  return <Database size={14} />;
  if (t.includes('ci') || t.includes('deploy') || t.includes('pipeline'))  return <Settings size={14} />;
  if (t.includes('review') || t.includes('code'))                           return <Code size={14} />;
  if (t.includes('design') || t.includes('ui') || t.includes('ux'))        return <Paintbrush size={14} />;
  if (t.includes('doc') || t.includes('readme') || t.includes('wiki'))     return <BookOpen size={14} />;
  return <Layers size={14} />;
}

function getDisplayId(card: CardType, index?: number): string {
  if (typeof index === 'number') return `#${index + 1}`;
  let hash = 0;
  for (let i = 0; i < card.id.length; i++) {
    hash = ((hash << 5) - hash) + card.id.charCodeAt(i);
    hash |= 0;
  }
  const num = (Math.abs(hash) % 900) + 100;
  return `#${num}`;
}

function getPriority(card: CardType): { label: string; color: string } {
  const labels = card.labels || [];
  const t = card.title.toLowerCase();
  if (labels.includes('urgent') || t.includes('urgent') || t.includes('critical')) {
    return { label: 'High', color: '#ef4444' };
  }
  if (labels.includes('bug') || labels.includes('feature')) {
    return { label: 'Medium', color: '#f59e0b' };
  }
  return { label: 'Low', color: '#64748b' };
}

export default function Card({
  card, cardIndex, colId, accentColor, isUrgent, isObserver,
  onClick, onToggleComplete, onDragStart, onDragEnd
}: Props) {
  const boards       = useWorkStore(s => s.boards);
  const activeBoardId= useWorkStore(s => s.activeBoardId);
  const board        = boards.find(b => b.id === activeBoardId) || null;
  const moveCard     = useWorkStore(s => s.moveCard);
  const undoLastMove = useWorkStore(s => s.undoLastMove);
  const showToast    = useToastStore(s => s.showToast);

  const labelMode    = useSettingsStore(s => s.labelMode);
  const customLabels = useSettingsStore(s => s.customLabels);
  const linkedRoadmap = card.linkedRoadmapId ? boards.find(b => b.id === card.linkedRoadmapId) : null;
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const [touchDelta, setTouchDelta] = useState({ x: 0, y: 0 });

  const touchTimerRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isDraggingActiveRef = useRef(false);
  const wasDraggingRef = useRef(false);

  const otherColumns = (board?.columns || []).filter(c => c.id !== colId);

  useEffect(() => {
    if (!card.dueDate || card.completed) return;
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 10_000);
    return () => clearInterval(interval);
  }, [card.dueDate, card.completed]);

  const dueStatus    = getDueStatus(card.dueDate);

  const allLabels = [...LABELS, ...customLabels];
  const labelHtml = (card.labels || []).map(lid => allLabels.find(l => l.id === lid)).filter(Boolean);
  const assignees = (card.assignees || [])
    .map(uid => (board?.members || []).find(m =>
      m.id === uid || (m.email && m.email.toLowerCase().trim() === uid.toLowerCase().trim())
    ))
    .filter(Boolean) as Member[];

  const isImageAttachment = (att: { type?: string; dataUrl?: string; name?: string }) => {
    return (
      att.type?.startsWith('image/') ||
      att.dataUrl?.startsWith('data:image/') ||
      /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(att.name || '')
    );
  };

  const coverAttachment = card.attachments?.find(a =>
    card.coverAttachmentId ? a.id === card.coverAttachmentId : isImageAttachment(a)
  );
  const priority  = getPriority(card);
  const icon      = getCardIcon(card);

  const col = board?.columns.find(c => c.id === colId);
  const columnName = col?.name || '';
  const isRoadmapBoard = board?.type === 'roadmap';
  const scheduleHealth = isRoadmapBoard ? getScheduleHealth(card, columnName) : null;

  // Helper to find target column by touch coordinates using bounding rectangles
  const getTargetColumn = (clientX: number, clientY: number): HTMLElement | null => {
    const columns = document.querySelectorAll<HTMLElement>('.column[data-col-id]');
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const rect = col.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return col;
      }
    }
    return null;
  };

  // Touch Drag & Drop for Mobile Phones
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isObserver) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isDraggingActiveRef.current = false;
    setTouchDelta({ x: 0, y: 0 });

    touchTimerRef.current = window.setTimeout(() => {
      isDraggingActiveRef.current = true;
      setIsTouchDragging(true);
      document.querySelector('.board-area')?.classList.add('touch-dragging-active');
      if (navigator.vibrate) {
        try { navigator.vibrate(40); } catch {}
      }
      onDragStart({
        dataTransfer: { effectAllowed: 'move', setData: () => {} },
        currentTarget: e.currentTarget
      } as any);
    }, 220);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isObserver) return;
    const touch = e.touches[0];
    if (!isDraggingActiveRef.current) {
      if (touchStartRef.current) {
        const dx = Math.abs(touch.clientX - touchStartRef.current.x);
        const dy = Math.abs(touch.clientY - touchStartRef.current.y);
        // Allow natural thumb tremor (up to 20px) without cancelling the hold timer
        if (dx > 20 || dy > 20) {
          if (touchTimerRef.current) {
            clearTimeout(touchTimerRef.current);
            touchTimerRef.current = null;
          }
        }
      }
      return;
    }

    if (e.cancelable) e.preventDefault();

    if (touchStartRef.current) {
      setTouchDelta({
        x: touch.clientX - touchStartRef.current.x,
        y: touch.clientY - touchStartRef.current.y,
      });
    }

    const targetCol = getTargetColumn(touch.clientX, touch.clientY);
    document.querySelectorAll('.column.drag-over').forEach(c => {
      if (c !== targetCol) c.classList.remove('drag-over');
    });
    if (targetCol) {
      targetCol.classList.add('drag-over');
    }

    const boardArea = document.querySelector('.board-area');
    if (boardArea) {
      if (touch.clientX < 80) {
        boardArea.scrollBy({ left: -16, behavior: 'auto' });
      } else if (touch.clientX > window.innerWidth - 80) {
        boardArea.scrollBy({ left: 16, behavior: 'auto' });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }

    if (isDraggingActiveRef.current) {
      wasDraggingRef.current = true;
      setTimeout(() => { wasDraggingRef.current = false; }, 150);
      isDraggingActiveRef.current = false;
      setIsTouchDragging(false);
      setTouchDelta({ x: 0, y: 0 });
      document.querySelector('.board-area')?.classList.remove('touch-dragging-active');
      document.querySelectorAll('.column.drag-over').forEach(c => c.classList.remove('drag-over'));

      const touch = e.changedTouches[0];
      const targetCol = getTargetColumn(touch.clientX, touch.clientY);
      const targetColId = targetCol?.getAttribute('data-col-id');

      if (targetColId && targetColId !== colId) {
        moveCard(card.id, colId, targetColId);
        const targetColName = board?.columns.find(c => c.id === targetColId)?.name || 'another column';
        showToast(`Moved to "${targetColName}"`, 'info', 4500, {
          label: 'Undo',
          onClick: undoLastMove,
        });
      }
      onDragEnd();
    }
  };

  const handleTouchCancel = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    if (isDraggingActiveRef.current) {
      isDraggingActiveRef.current = false;
      setIsTouchDragging(false);
      setTouchDelta({ x: 0, y: 0 });
      document.querySelector('.board-area')?.classList.remove('touch-dragging-active');
      document.querySelectorAll('.column.drag-over').forEach(c => c.classList.remove('drag-over'));
      onDragEnd();
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96, y: 8, filter: 'blur(3px)' }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.88, y: 12, filter: 'blur(6px)', transition: { duration: 0.2, ease: [0.65, 0, 0.35, 1] } }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      className={`card ${card.completed ? 'completed' : ''}${isTouchDragging ? ' touch-dragging' : ''}`}
      data-card-id={card.id}
      draggable={!isObserver}
      onDragStart={(e: any) => (isObserver ? undefined : onDragStart(e))}
      onDragEnd={isObserver ? undefined : onDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onClick={(e) => {
        if (wasDraggingRef.current) return;
        onClick();
      }}
      style={{
        cursor: isObserver ? 'pointer' : 'grab',
        ...(isTouchDragging ? {
          transform: `translate3d(${touchDelta.x}px, ${touchDelta.y}px, 0) scale(1.04) rotate(1.5deg)`,
          opacity: 0.94,
          boxShadow: '0 24px 48px rgba(0,0,0,0.55)',
          zIndex: 9999,
          transition: 'none',
          border: '2px solid hsl(var(--primary))'
        } : {})
      }}
    >
      {/* Cover Image Thumbnail */}
      {coverAttachment && (
        <div style={{ margin: '-14px -14px 10px -14px', borderRadius: '12px 12px 0 0', overflow: 'hidden', backgroundColor: 'hsl(var(--secondary))' }}>
          <img
            src={coverAttachment.dataUrl}
            alt={coverAttachment.name}
            style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'contain' }}
          />
        </div>
      )}

      {/* Reference + priority */}
      <div className="wpc-top">
        <span className="wpc-ref">{getDisplayId(card)}</span>
        <span className={`wpc-priority p-${priority.label.toLowerCase()}`} title={`Priority: ${priority.label}`}>{priority.label}</span>
      </div>

      <div className="card-title">{card.title}</div>

      {(labelHtml.length > 0 || linkedRoadmap) && (
        <div className="wpc-labels">
          {linkedRoadmap && (
            <span
              className="wpc-label link"
              title={`Linked roadmap: ${linkedRoadmap.name}`}
              onClick={(e) => {
                e.stopPropagation();
                useWorkStore.getState().switchBoard(linkedRoadmap.id);
                localStorage.setItem('waypoint_current_page_v1', 'roadmap');
                localStorage.setItem('waypoint_current_board_id_v1', linkedRoadmap.id);
                localStorage.setItem('waypoint_current_view_mode_v1', 'roadmap');
                window.dispatchEvent(new Event('storage'));
              }}
            >
              ↗ {linkedRoadmap.name}
            </span>
          )}
          {labelHtml.map(lbl => lbl && (
            <span key={lbl.id} className="wpc-label">{lbl.name}</span>
          ))}
        </div>
      )}

      {/* Footer: due · notes · files ··· people, move, done */}
      <div className="wpc-foot">
        {card.dueDate && (
          <span className={`wpc-due${dueStatus === 'overdue' && !card.completed ? ' overdue' : dueStatus === 'due-soon' && !card.completed ? ' soon' : ''}`}>
            {dueStatus === 'overdue' && !card.completed ? 'Overdue · ' : ''}{formatDueDate(card.dueDate)}
          </span>
        )}
        {card.comments?.length > 0 && <span className="wpc-count">{card.comments.length} {card.comments.length === 1 ? 'note' : 'notes'}</span>}
        {card.attachments?.length > 0 && <span className="wpc-count">{card.attachments.length} {card.attachments.length === 1 ? 'file' : 'files'}</span>}
        <span className="wpc-spacer" />

        {assignees.length > 0 && (
          <span className="wpc-people">
            {assignees.slice(0, 3).map(m => m && (
              m.avatarUrl
                ? <img key={m.id} src={m.avatarUrl} alt={m.name} title={m.name} className="wpc-avatar" />
                : <span key={m.id} className="wpc-avatar" title={m.name}>{avatarInitials(m.name)}</span>
            ))}
            {assignees.length > 3 && <span className="wpc-avatar more">+{assignees.length - 3}</span>}
          </span>
        )}

        {!isObserver && otherColumns.length > 0 && (
          <span style={{ position: 'relative' }}>
            <button
              type="button"
              className={`wpc-text-btn${showMoveMenu ? ' active' : ''}`}
              title="Move to another column"
              onClick={(e) => { e.stopPropagation(); setShowMoveMenu(s => !s); }}
            >
              Move
            </button>
            <AnimatePresence>
              {showMoveMenu && (
                <motion.div
                  className="wp-menu"
                  style={{ bottom: 'calc(100% + 6px)', right: 0, width: 180 }}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.12 }}
                  onClick={e => e.stopPropagation()}
                >
                  <div className="wp-menu-head"><span className="wp-eyebrow">Move to</span></div>
                  {otherColumns.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="wp-menu-item"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoveMenu(false);
                        moveCard(card.id, colId, c.id);
                        showToast(`Moved to "${c.name}"`, 'success', 4500, { label: 'Undo', onClick: undoLastMove });
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </span>
        )}

        <button
          type="button"
          className={`wpc-done${card.completed ? ' checked' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleComplete(e); }}
          title={card.completed ? 'Mark as not done' : 'Mark as done'}
          aria-pressed={card.completed}
        />
      </div>

      {/* Mini Timeline Bar (bottom edge of card — Roadmap boards only) */}
      {isRoadmapBoard && scheduleHealth && scheduleHealth.timelinePct !== undefined && !card.completed && (
        <div
          style={{
            margin: '4px -12px -11px -12px',
            height: 3,
            background: 'hsl(var(--border) / 0.5)',
            overflow: 'hidden',
            borderRadius: '0 0 var(--radius) var(--radius)',
            position: 'relative',
          }}
          title={`Scheduled timeline: ${scheduleHealth.timelinePct}% elapsed (${scheduleHealth.label})`}
        >
          <div
            style={{
              height: '100%',
              width: `${scheduleHealth.timelinePct}%`,
              backgroundColor: scheduleHealth.color,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}
    </motion.div>
  );
}
