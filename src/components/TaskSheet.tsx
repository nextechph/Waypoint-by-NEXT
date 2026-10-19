import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useWorkStore, sortColumnsByWorkflow } from '../store/useWorkStore';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { useConfirmStore } from '../store/useConfirmStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { LABELS, type Comment, type Subtask } from '../types';
import { formatBytes, isImageFile, uid, sortMembersWithOwnerFirst } from '../utils';
import { canEditBoard, isBoardOwner, isMe, formatShortDate, timeAgo } from '../lib/workspace';
import { useEscape } from '../lib/useEscape';
import { Select } from './ui/Select';
import DatePicker from './ui/DatePicker';
import { MemberAvatar } from './wp/primitives';
import { ArrowLeft, CalendarRange, Trash2, X, Plus, Upload, Reply, AlignLeft, MessageSquare, Paperclip, Activity, Send } from './ui/icons';

interface Props {
  cardId: string;
  boardId?: string | null;
  onClose: () => void;
  /** Roadmap cards keep their detailed schedule editor (actuals, suspensions, worked days). */
  onOpenScheduleEditor?: () => void;
}

type Tab = 'details' | 'comments' | 'files' | 'activity';

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export default function TaskSheet({ cardId, boardId, onClose, onOpenScheduleEditor }: Props) {
  // Subscribe to boards so the sheet re-renders on every change to this card.
  useWorkStore(s => s.boards);
  const findCard = useWorkStore(s => s.findCard);
  const updateCard = useWorkStore(s => s.updateCard);
  const deleteCard = useWorkStore(s => s.deleteCard);
  const moveCard = useWorkStore(s => s.moveCard);
  const moveInboxCardToColumn = useWorkStore(s => s.moveInboxCardToColumn);
  const toggleCardComplete = useWorkStore(s => s.toggleCardComplete);
  const toggleCardLabel = useWorkStore(s => s.toggleCardLabel);
  const toggleCardAssignee = useWorkStore(s => s.toggleCardAssignee);
  const addComment = useWorkStore(s => s.addComment);
  const deleteComment = useWorkStore(s => s.deleteComment);
  const addAttachment = useWorkStore(s => s.addAttachment);
  const removeAttachment = useWorkStore(s => s.removeAttachment);
  const user = useAuthStore(s => s.user);
  const showToast = useToastStore(s => s.showToast);
  const showConfirm = useConfirmStore(s => s.showConfirm);
  const customLabels = useSettingsStore(s => s.customLabels);

  const found = findCard(cardId, boardId || undefined);
  const [tab, setTab] = useState<Tab>('details');
  const [title, setTitle] = useState(found?.card.title ?? '');
  const [desc, setDesc] = useState(found?.card.description ?? '');
  const [newSubtask, setNewSubtask] = useState('');
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEscape(onClose);

  // Keep local drafts in sync when another device edits the card.
  const cardTitle = found?.card.title;
  const cardDesc = found?.card.description;
  useEffect(() => { if (cardTitle !== undefined) setTitle(cardTitle); }, [cardTitle]);
  useEffect(() => { if (cardDesc !== undefined) setDesc(cardDesc); }, [cardDesc]);

  const allLabels = useMemo(() => [...LABELS, ...customLabels], [customLabels]);

  const activity = useActivity(found?.card, found?.column?.name);

  if (!found) return null;
  const { card, column, board, isInbox } = found;
  const editable = canEditBoard(board, user?.email);
  const owner = isBoardOwner(board, user?.email);
  const members = sortMembersWithOwnerFirst(board.members || [], board.createdBy);
  const me = members.find(m => isMe(m, user));
  const isAdmin = me?.role === 'admin';
  // Observers are read-only for task fields but can still take part in the discussion.
  const canComment = editable || Boolean(me);
  const columns = sortColumnsByWorkflow(board.columns || []);
  const subtasks: Subtask[] = card.subtasks || [];
  const doneSubtasks = subtasks.filter(s => s.done).length;
  const assignees = members.filter(m => (card.assignees || []).includes(m.id));
  const highPriority = (card.labels || []).includes('urgent');
  const topComments = (card.comments || []).filter(c => !c.parentId);
  const repliesOf = (id: string) => (card.comments || []).filter(c => c.parentId === id);
  const isRoadmap = board.type === 'roadmap';

  const saveTitle = () => {
    const t = title.trim();
    if (t && t !== card.title) updateCard(card.id, { title: t });
    else setTitle(card.title);
  };
  const saveDesc = () => { if (desc !== card.description) updateCard(card.id, { description: desc }); };

  const setSubtasks = (next: Subtask[]) => updateCard(card.id, { subtasks: next });
  const addSubtask = () => {
    const t = newSubtask.trim();
    if (!t) return;
    setSubtasks([...subtasks, { id: uid(), title: t, done: false }]);
    setNewSubtask('');
  };

  const moveTo = (colId: string) => {
    if (isInbox) moveInboxCardToColumn(card.id, colId);
    else if (column && colId !== column.id) moveCard(card.id, column.id, colId);
    const name = board.columns.find(c => c.id === colId)?.name;
    if (name) showToast(`Moved to ${name}`, 'success');
  };

  const handleFiles = (files: FileList | null) => {
    Array.from(files || []).forEach(file => {
      if (file.size > MAX_FILE_SIZE) {
        showToast(`"${file.name}" is larger than 5 MB`, 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => addAttachment(card.id, {
        id: uid(),
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        dataUrl: (ev.target?.result as string) ?? '',
        addedAt: new Date().toISOString(),
      });
      reader.readAsDataURL(file);
    });
    if (fileRef.current) fileRef.current.value = '';
  };

  const postComment = () => {
    const text = comment.trim();
    if (!text) return;
    addComment(card.id, text, replyTo?.id ?? null, replyTo?.author ?? null);
    setComment('');
    setReplyTo(null);
  };

  const canDeleteComment = (c: Comment) =>
    owner || isAdmin || (user?.email && c.authorEmail?.toLowerCase() === user.email.toLowerCase()) || (user?.name && c.author === user.name);

  const confirmDeleteTask = () => showConfirm({
    title: `Delete "${card.title}"?`,
    message: 'This permanently deletes the task with its subtasks, comments and files.',
    confirmText: 'Delete task',
    variant: 'danger',
    icon: 'trash',
    onConfirm: () => { deleteCard(card.id); showToast('Task deleted', 'info'); onClose(); },
  });

  return (
    <motion.div
      className="wp-sheet-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.24 }}
      onClick={onClose}
    >
      <motion.aside
        className="wp-sheet"
        role="dialog"
        aria-label={card.title}
        initial={{ opacity: 0, x: 60, filter: 'blur(6px)' }}
        animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, x: 60, filter: 'blur(4px)' }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
      >
        <header className="wp-sheet-head">
          <button type="button" className="wp-text-link" onClick={onClose}><ArrowLeft size={14} /> Back</button>
          <div className="wp-sheet-crumbs">
            <span>{board.name}</span>
            <span className="wp-crumb-sep">/</span>
            <span>Task</span>
          </div>
          <div className="wp-sheet-head-actions">
            {isRoadmap && onOpenScheduleEditor && (
              <button type="button" className="wp-text-link" onClick={onOpenScheduleEditor}><CalendarRange size={14} /> Schedule editor</button>
            )}
            {editable && <button type="button" className="wp-text-link" onClick={confirmDeleteTask} title="Delete task" aria-label="Delete task"><Trash2 size={16} /></button>}
            <button type="button" className="wp-icon-btn" onClick={onClose} title="Close" aria-label="Close"><X size={18} /></button>
          </div>
        </header>

        <div className="wp-sheet-body">
          <div className="wp-sheet-title-row">
            <button
              type="button"
              className={`wpc-done lg${card.completed ? ' checked' : ''}`}
              onClick={() => editable && toggleCardComplete(card.id)}
              disabled={!editable}
              aria-label={card.completed ? 'Mark as not done' : 'Mark as done'}
            />
            <textarea
              className="wp-sheet-title"
              value={title}
              rows={1}
              readOnly={!editable}
              onChange={e => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); } }}
            />
          </div>

          <div className="wp-sheet-tags">
            {card.isMilestone && <span className="wp-tag">Milestone</span>}
            {highPriority && <span className="wp-tag strong">High priority</span>}
            {(card.labels || []).filter(l => l !== 'urgent').map(l => (
              <span key={l} className="wp-tag">{allLabels.find(x => x.id === l)?.name || l}</span>
            ))}
          </div>

          <textarea
            className="wp-sheet-desc"
            placeholder={editable ? 'Add a description…' : 'No description'}
            value={desc}
            readOnly={!editable}
            onChange={e => setDesc(e.target.value)}
            onBlur={saveDesc}
          />

          <div className="wp-sheet-summary">
            <span className="wp-avatar-stack">
              {assignees.slice(0, 4).map(m => <MemberAvatar key={m.id} member={m} size={24} />)}
            </span>
            <span>{assignees.length ? `${assignees.length} ${assignees.length === 1 ? 'assignee' : 'assignees'}` : 'Unassigned'}</span>
            <span className="wp-sheet-sep" />
            <span>{card.dueDate ? `${isRoadmap ? 'Ends' : 'Due'} ${formatShortDate(card.dueDate)}` : isRoadmap ? 'No end date' : 'No deadline'}</span>
            <span className="wp-sheet-sep" />
            <span className={`wp-status-pill${card.completed ? ' done' : ''}`}>{card.completed ? 'Completed' : isInbox ? 'Backlog' : column?.name}</span>
          </div>

          <nav className="wp-tabs wp-sheet-tabs" role="tablist">
            {([
              ['details', 'Details', AlignLeft],
              ['comments', `Comments (${card.comments?.length || 0})`, MessageSquare],
              ['files', `Files (${card.attachments?.length || 0})`, Paperclip],
              ['activity', 'Activity', Activity],
            ] as const).map(([id, label, TabIcon]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={`wp-tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
                <TabIcon size={15} weight={tab === id ? 'fill' : 'regular'} />
                {label}
              </button>
            ))}
          </nav>

          {tab === 'details' && (
            <div className="wp-sheet-section">
              {/* Subtasks */}
              <div className="wp-sheet-block">
                <div className="wp-sheet-block-head">
                  <span className="wp-eyebrow">Subtasks</span>
                  <span className="wp-muted-sm">{doneSubtasks}/{subtasks.length}</span>
                </div>
                <ul className="wp-subtasks">
                  {subtasks.map(st => (
                    <li key={st.id} className={st.done ? 'done' : undefined}>
                      <button
                        type="button"
                        className={`wp-check${st.done ? ' checked' : ''}`}
                        disabled={!editable}
                        onClick={() => setSubtasks(subtasks.map(x => (x.id === st.id ? { ...x, done: !x.done } : x)))}
                        aria-label={st.done ? 'Mark subtask as not done' : 'Mark subtask as done'}
                      />
                      <span className="wp-subtask-title">{st.title}</span>
                      {editable && (
                        <button type="button" className="wp-text-link" onClick={() => setSubtasks(subtasks.filter(x => x.id !== st.id))} aria-label="Remove subtask"><X size={13} /></button>
                      )}
                    </li>
                  ))}
                </ul>
                {editable && (
                  <div className="wp-subtask-add">
                    <input
                      value={newSubtask}
                      placeholder="Add a subtask"
                      onChange={e => setNewSubtask(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addSubtask(); }}
                    />
                    <button type="button" className="wp-text-link" onClick={addSubtask} disabled={!newSubtask.trim()}><Plus size={13} weight="bold" /> Add</button>
                  </div>
                )}
              </div>

              {/* Properties */}
              <dl className="wp-props">
                <dt>Status</dt>
                <dd>
                  {editable ? (
                    <Select
                      size="sm"
                      value={isInbox ? '__inbox' : column?.id || ''}
                      onChange={v => v !== '__inbox' && moveTo(v)}
                      options={[...(isInbox ? [{ value: '__inbox', label: 'Backlog' }] : []), ...columns.map(c => ({ value: c.id, label: c.name }))]}
                    />
                  ) : (isInbox ? 'Backlog' : column?.name)}
                </dd>

                <dt>Priority</dt>
                <dd>
                  <div className="wp-segmented sm">
                    <button type="button" disabled={!editable} className={!highPriority ? 'active' : ''} onClick={() => highPriority && toggleCardLabel(card.id, 'urgent')}>Normal</button>
                    <button type="button" disabled={!editable} className={highPriority ? 'active' : ''} onClick={() => !highPriority && toggleCardLabel(card.id, 'urgent')}>High</button>
                  </div>
                </dd>

                {/* Roadmaps schedule a start and end; task boards track a single deadline. */}
                {isRoadmap && (
                  <>
                    <dt>Scheduled start</dt>
                    <dd>{editable ? <DatePicker value={card.startDate || null} onChange={v => updateCard(card.id, { startDate: v })} placeholder="No start date" /> : (card.startDate ? formatShortDate(card.startDate) : '—')}</dd>
                  </>
                )}

                <dt>{isRoadmap ? 'Scheduled end' : 'Deadline'}</dt>
                <dd>{editable ? <DatePicker value={card.dueDate} onChange={v => updateCard(card.id, { dueDate: v })} placeholder={isRoadmap ? 'No end date' : 'No deadline'} /> : (card.dueDate ? formatShortDate(card.dueDate) : '—')}</dd>

                <dt>Milestone</dt>
                <dd>
                  <label className="wp-check-row tight">
                    <input type="checkbox" checked={!!card.isMilestone} disabled={!editable} onChange={e => updateCard(card.id, { isMilestone: e.target.checked })} />
                    <span>{card.isMilestone ? 'This task is a milestone' : 'Mark as a milestone'}</span>
                  </label>
                </dd>

                <dt>Labels</dt>
                <dd>
                  <div className="wp-chip-row">
                    {allLabels.filter(l => l.id !== 'urgent').map(l => {
                      const on = (card.labels || []).includes(l.id);
                      return (
                        <button key={l.id} type="button" disabled={!editable} className={`wp-chip${on ? ' on' : ''}`} onClick={() => toggleCardLabel(card.id, l.id)}>
                          {l.name}
                        </button>
                      );
                    })}
                  </div>
                </dd>

                <dt>Assignees</dt>
                <dd>
                  <div className="wp-assignee-list">
                    {members.map(m => {
                      const on = (card.assignees || []).includes(m.id);
                      return (
                        <button key={m.id} type="button" disabled={!editable} className={`wp-assignee${on ? ' on' : ''}`} onClick={() => toggleCardAssignee(card.id, m.id)}>
                          <MemberAvatar member={m} size={22} ring={false} />
                          <span>{m.name}{isMe(m, user) ? ' (you)' : ''}</span>
                          <span className="wp-assignee-state">{on ? 'Assigned' : 'Assign'}</span>
                        </button>
                      );
                    })}
                  </div>
                </dd>

                <dt>Created</dt>
                <dd className="wp-muted-sm">{formatShortDate(card.createdAt)}</dd>
              </dl>
            </div>
          )}

          {tab === 'comments' && (
            <div className="wp-sheet-section">
              {topComments.length === 0 && <p className="wp-muted">No comments yet. Start the conversation.</p>}
              <ul className="wp-comments">
                {topComments.map(c => (
                  <li key={c.id}>
                    <CommentItem c={c} canDelete={!!canDeleteComment(c)} onReply={canComment ? () => setReplyTo(c) : undefined} onDelete={() => deleteComment(card.id, c.id)} />
                    {repliesOf(c.id).length > 0 && (
                      <ul className="wp-replies">
                        {repliesOf(c.id).map(r => (
                          <li key={r.id}><CommentItem c={r} canDelete={!!canDeleteComment(r)} onDelete={() => deleteComment(card.id, r.id)} /></li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'files' && (
            <div className="wp-sheet-section">
              {(card.attachments || []).length === 0 && <p className="wp-muted">No files attached.</p>}
              <ul className="wp-files">
                {(card.attachments || []).map(a => (
                  <li key={a.id}>
                    {isImageFile(a.name) && a.dataUrl ? <img src={a.dataUrl} alt="" className="wp-file-thumb" /> : <span className="wp-file-ext">{(a.name.split('.').pop() || 'file').slice(0, 4)}</span>}
                    <a href={a.dataUrl} download={a.name} className="wp-file-name" target="_blank" rel="noreferrer">{a.name}</a>
                    <span className="wp-muted-sm">{formatBytes(a.size)}</span>
                    {editable && isImageFile(a.name) && (
                      <button type="button" className="wp-text-link" onClick={() => updateCard(card.id, { coverAttachmentId: card.coverAttachmentId === a.id ? null : a.id })}>
                        {card.coverAttachmentId === a.id ? 'Remove cover' : 'Set cover'}
                      </button>
                    )}
                    {editable && <button type="button" className="wp-text-link" onClick={() => removeAttachment(card.id, a.id)} aria-label="Remove file" title="Remove file"><Trash2 size={14} /></button>}
                  </li>
                ))}
              </ul>
              {editable && (
                <>
                  <input ref={fileRef} type="file" multiple hidden onChange={e => handleFiles(e.target.files)} />
                  <button type="button" className="wp-btn wp-btn-ghost" onClick={() => fileRef.current?.click()}><Upload size={15} /> Upload files</button>
                </>
              )}
            </div>
          )}

          {tab === 'activity' && (
            <div className="wp-sheet-section">
              <ol className="wp-activity">
                {activity.map((ev, i) => (
                  <li key={i}>
                    <span className="wp-activity-time">{timeAgo(ev.time)}</span>
                    <span>{ev.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {canComment && (
          <footer className="wp-sheet-composer">
            {replyTo && (
              <div className="wp-replying">
                Replying to {replyTo.author}
                <button type="button" className="wp-text-link" onClick={() => setReplyTo(null)}>Cancel</button>
              </div>
            )}
            <div className="wp-composer-row">
              <textarea
                value={comment}
                placeholder="Add a comment… use @name to mention"
                rows={1}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment(); }}
              />
              <button type="button" className="wp-btn wp-btn-primary" onClick={postComment} disabled={!comment.trim()}><Send size={14} /> Post</button>
            </div>
          </footer>
        )}
      </motion.aside>
    </motion.div>
  );
}

function CommentItem({ c, canDelete, onReply, onDelete }: { c: Comment; canDelete: boolean; onReply?: () => void; onDelete: () => void }) {
  return (
    <div className="wp-comment">
      <MemberAvatar member={{ name: c.author, color: c.avatarColor }} size={28} ring={false} />
      <div className="wp-comment-body">
        <div className="wp-comment-head">
          <strong>{c.author}</strong>
          <span className="wp-muted-sm">{timeAgo(c.createdAt)}</span>
        </div>
        <p>{c.replyToAuthor ? <span className="wp-muted">@{c.replyToAuthor} </span> : null}{c.text}</p>
        {(c.attachments || []).filter(a => a.dataUrl).map(a => (
          isImageFile(a.name) ? <img key={a.id} src={a.dataUrl} alt={a.name} className="wp-comment-img" /> : <a key={a.id} href={a.dataUrl} download={a.name} className="wp-file-name">{a.name}</a>
        ))}
        <div className="wp-comment-actions">
          {onReply && <button type="button" className="wp-text-link" onClick={onReply}><Reply size={13} /> Reply</button>}
          {canDelete && <button type="button" className="wp-text-link" onClick={onDelete}><Trash2 size={13} /> Delete</button>}
        </div>
      </div>
    </div>
  );
}

function useActivity(card: { createdAt: string; completedAt: string | null; comments: Comment[]; attachments: { name: string; addedAt: string }[] } | undefined, columnName?: string) {
  return useMemo(() => {
    if (!card) return [];
    const events: Array<{ time: string; text: string }> = [{ time: card.createdAt, text: `Task created${columnName ? ` in ${columnName}` : ''}` }];
    (card.comments || []).forEach(c => events.push({ time: c.createdAt, text: `${c.author} ${c.parentId ? 'replied' : 'commented'}: “${c.text.length > 80 ? `${c.text.slice(0, 80)}…` : c.text}”` }));
    (card.attachments || []).forEach(a => events.push({ time: a.addedAt, text: `File added: ${a.name}` }));
    if (card.completedAt) events.push({ time: card.completedAt, text: 'Marked as complete' });
    return events.filter(e => e.time).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [card, columnName]);
}
