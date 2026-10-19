import React, { useState } from 'react';
import { Check, X } from '../ui/icons';
import { motion } from 'framer-motion';
import { useWorkStore } from '../../store/useWorkStore';
import { useEscape } from '../../lib/useEscape';
import { modalMotion } from '../../lib/motion';
import { useErrorShake } from '../ui/transitions';

interface Props {
  onClose: () => void;
  mode?: 'column' | 'row';
}

export default function AddColumnModal({ onClose, mode = 'column' }: Props) {
  useEscape(() => onClose());
  const addColumn = useWorkStore(s => s.addColumn);
  const [name, setName] = useState('');
  const nameErr = useErrorShake();

  const isRow = mode === 'row';
  const labelText = isRow ? 'Row' : 'Column';

  const handleAdd = () => {
    if (!name.trim()) { nameErr.showError(); return; }
    addColumn(name.trim());
    setName('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        {...modalMotion}
        className="modal small-modal"
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">Add {labelText}</h2>
          <motion.button whileTap={{ scale: 0.92 }} className="icon-btn" onClick={onClose}><X size={15} /></motion.button>
        </div>
        <div className="modal-body">
          <div ref={nameErr.wrapRef} className="form-group t-input-wrap wp-field-err">
            <label className="field-label">{labelText} Name</label>
            <div ref={nameErr.inputRef} className="t-input">
              <input
                type="text"
                className="text-input"
                placeholder="e.g. In Review"
                maxLength={40}
                value={name}
                onChange={e => { setName(e.target.value); nameErr.clear(); }}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                autoFocus
              />
            </div>
            <p className="t-error-msg">Give it a name first</p>
          </div>
        </div>
        <div className="modal-footer">
          <motion.button whileTap={{ scale: 0.95 }} className="btn btn-secondary" onClick={onClose}>Cancel</motion.button>
          <motion.button
            whileTap={name.trim() ? { scale: 0.95 } : undefined}
            className="btn btn-primary"
            onClick={handleAdd}
            aria-disabled={!name.trim()}
            style={{
              opacity: name.trim() ? 1 : 0.5,
              cursor: name.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            <Check size={14} /> Add {labelText}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
