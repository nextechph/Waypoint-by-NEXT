import React, { useState } from 'react';
import { Check, X } from '../ui/icons';
import { motion } from 'framer-motion';
import { useWorkStore } from '../../store/useWorkStore';
import { useToastStore } from '../../store/useToastStore';
import { useAuthStore } from '../../store/useAuthStore';
import { BOARD_COLORS } from '../../types';
import { useEscape } from '../../lib/useEscape';
import { modalMotion } from '../../lib/motion';
import { useErrorShake } from '../ui/transitions';

interface Props {
  onClose: (createdBoardId?: string) => void;
}

export default function CreateBoardModal({ onClose }: Props) {
  useEscape(() => onClose());
  const createBoard = useWorkStore(s => s.createBoard);
  const showToast = useToastStore(s => s.showToast);
  const user = useAuthStore(s => s.user);
  const [name, setName] = useState('');
  const nameErr = useErrorShake();
  const [selectedColor, setSelectedColor] = useState<string>(BOARD_COLORS[0].value);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (isSubmitting) return;
    if (!name.trim()) { nameErr.showError(); return; }
    setIsSubmitting(true);
    try {
      const newBoard = await createBoard(name.trim(), selectedColor, user?.email, user?.name);
      showToast(`Board "${name.trim()}" created`, 'success');
      setName('');
      setSelectedColor(BOARD_COLORS[0].value);
      onClose(newBoard.id);
    } catch (err) {
      console.error('[CreateBoardModal] error creating board:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => onClose()}>
      <motion.div
        {...modalMotion}
        className="modal small-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">Create Board</h2>
          <motion.button whileTap={{ scale: 0.92 }} className="icon-btn" onClick={() => onClose()}><X size={15} /></motion.button>
        </div>
        <div className="modal-body">
          <div ref={nameErr.wrapRef} className="form-group t-input-wrap wp-field-err">
            <label className="field-label">Board Name</label>
            <div ref={nameErr.inputRef} className="t-input">
              <input
                type="text"
                className="text-input"
                placeholder="e.g. Marketing Campaign, Operations, Project Board"
                maxLength={50}
                value={name}
                onChange={e => { setName(e.target.value); nameErr.clear(); }}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                autoFocus
              />
            </div>
            <p className="t-error-msg">Give it a name first</p>
          </div>
        </div>
        <div className="modal-footer">
          <motion.button whileTap={{ scale: 0.95 }} className="btn btn-secondary" onClick={() => onClose()}>Cancel</motion.button>
          <motion.button
            whileTap={(name.trim() && !isSubmitting) ? { scale: 0.95 } : undefined}
            className="btn btn-primary"
            onClick={handleCreate}
            disabled={isSubmitting}
            aria-disabled={!name.trim() || isSubmitting}
            style={{
              opacity: (name.trim() && !isSubmitting) ? 1 : 0.5,
              cursor: (name.trim() && !isSubmitting) ? 'pointer' : 'not-allowed',
            }}
          >
            <Check size={14} /> {isSubmitting ? 'Creating...' : 'Create Board'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
