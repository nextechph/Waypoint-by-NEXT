import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useWorkStore, sortColumnsByWorkflow } from '../../store/useWorkStore';
import { useToastStore } from '../../store/useToastStore';
import { canEditBoard, isMe, useWorkspace } from '../../lib/workspace';
import { Select } from '../ui/Select';
import DatePicker from '../ui/DatePicker';
import { X, KanbanSquare, Milestone } from '../ui/icons';
import { modalMotion } from '../../lib/motion';
import { useErrorShake } from '../ui/transitions';

interface Props {
  /** Preselect a project (e.g. when opened from a project header). */
  boardId?: string | null;
  onClose: () => void;
  onCreated?: (cardId: string, boardId: string) => void;
  onCreateProject?: () => void;
  onCreateRoadmap?: () => void;
}

export default function QuickTaskModal({ boardId, onClose, onCreated, onCreateProject, onCreateRoadmap }: Props) {
  const { user, boards } = useWorkspace();
  const addCard = useWorkStore(s => s.addCard);
  const updateCard = useWorkStore(s => s.updateCard);
  const showToast = useToastStore(s => s.showToast);

  const projects = useMemo(
    () => boards.filter(b => canEditBoard(b, user?.email) && (b.columns?.length ?? 0) > 0),
    [boards, user?.email]
  );

  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string>(() =>
    (boardId && projects.some(p => p.id === boardId) ? boardId : projects.find(p => p.type !== 'roadmap')?.id || projects[0]?.id) || ''
  );
  const project = projects.find(p => p.id === projectId);
  const columns = useMemo(() => (project ? sortColumnsByWorkflow(project.columns) : []), [project]);
  const defaultColumn = columns.find(c => /to ?do|backlog/i.test(c.name)) || columns[0];
  const [columnId, setColumnId] = useState<string>('');
  const resolvedColumnId = columns.some(c => c.id === columnId) ? columnId : defaultColumn?.id || '';
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [assignMe, setAssignMe] = useState(true);
  const titleErr = useErrorShake();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const me = project?.members?.find(m => isMe(m, user));
  const canSubmit = Boolean(title.trim() && project && resolvedColumnId);

  const submit = () => {
    if (!title.trim() && project) { titleErr.showError(); return; }
    if (!canSubmit || !project) return;
    const card = addCard(resolvedColumnId, title.trim());
    const patch: Record<string, unknown> = {};
    if (dueDate) patch.dueDate = dueDate;
    if (assignMe && me) patch.assignees = [me.id];
    if (Object.keys(patch).length) updateCard(card.id, patch);
    showToast(`Task added to ${project.name}`, 'success');
    onCreated?.(card.id, project.id);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        {...modalMotion}
        className="modal small-modal wp-quick-task"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="wp-eyebrow">New task</div>
            <h2 className="modal-title" style={{ marginTop: 4 }}>What’s next?</h2>
          </div>
          <button type="button" className="wp-icon-ghost" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        {projects.length === 0 ? (
          <div className="modal-body">
            <p className="wp-muted">Tasks live inside a project. Start a task board or a roadmap, then add tasks to it.</p>
            <div className="wp-quick-create">
              {onCreateProject && (
                <button type="button" className="wp-btn wp-btn-primary" onClick={() => { onClose(); onCreateProject(); }}>
                  <KanbanSquare size={16} /> Task board
                </button>
              )}
              {onCreateRoadmap && (
                <button type="button" className="wp-btn wp-btn-outline" onClick={() => { onClose(); onCreateRoadmap(); }}>
                  <Milestone size={16} /> Roadmap
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="modal-body">
              <div ref={titleErr.wrapRef} className="t-input-wrap wp-field-err wp-quick-title-wrap">
                <div ref={titleErr.inputRef} className="t-input">
                  <input
                    className="wp-quick-title"
                    placeholder="Task title"
                    value={title}
                    maxLength={140}
                    autoFocus
                    onChange={e => { setTitle(e.target.value); titleErr.clear(); }}
                    onKeyDown={e => { if (e.key === 'Enter') submit(); }}
                  />
                </div>
                <p className="t-error-msg">Give it a title first</p>
              </div>
              <div className="wp-quick-grid">
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="field-label">Project</label>
                  <Select
                    value={projectId}
                    onChange={v => { setProjectId(v); setColumnId(''); }}
                    options={projects.map(p => ({ value: p.id, label: p.name, color: p.color }))}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="field-label">{project?.type === 'roadmap' ? 'Phase' : 'Column'}</label>
                  <Select
                    value={resolvedColumnId}
                    onChange={setColumnId}
                    options={columns.map(c => ({ value: c.id, label: c.name }))}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="field-label">Due date</label>
                  <DatePicker value={dueDate} onChange={setDueDate} placeholder="No due date" />
                </div>
                <label className="wp-check-row">
                  <input type="checkbox" checked={assignMe && Boolean(me)} disabled={!me} onChange={e => setAssignMe(e.target.checked)} />
                  <span>Assign to me</span>
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="wp-btn wp-btn-ghost" onClick={onClose}>Cancel</button>
              <button type="button" className="wp-btn wp-btn-primary" onClick={submit} disabled={!project || !resolvedColumnId} aria-disabled={!canSubmit}>
                Add task
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
