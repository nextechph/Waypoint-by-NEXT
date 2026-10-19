import React from 'react';
import { XCircle, AlertTriangle, Info, X } from './ui/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore } from '../store/useToastStore';
import type { ToastType } from '../store/useToastStore';
import { toastMotion } from '../lib/motion';
import { SuccessCheck } from './ui/transitions';

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <span style={{ display: 'inline-flex', color: '#10b981' }}><SuccessCheck size={16} /></span>,
  error:   <XCircle size={16} color="#ef4444" />,
  warning: <AlertTriangle size={16} color="#f59e0b" />,
  info:    <Info size={16} color="#3b82f6" />,
};

export default function Toast() {
  const toasts = useToastStore(s => s.toasts);
  const removeToast = useToastStore(s => s.removeToast);

  return (
    <div className="toast-container" style={{ perspective: 1000 }}>
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            {...toastMotion}
            className={`toast ${t.type}`}
          >
            <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {iconMap[t.type]}
            </div>
            <span style={{ flex: 1, fontSize: 13, color: 'hsl(var(--foreground))' }}>{t.msg}</span>
            {t.action && (
              <motion.button
                whileTap={{ scale: 0.94 }}
                className={t.action.variant === 'danger' ? 'btn' : t.action.variant === 'primary' ? 'btn btn-primary' : 'btn btn-secondary'}
                style={{
                  padding: '3px 9px',
                  fontSize: 11.5,
                  fontWeight: 600,
                  borderRadius: 8,
                  flexShrink: 0,
                  cursor: 'pointer',
                  ...(t.action.variant === 'danger' ? {
                    backgroundColor: '#ef4444',
                    color: '#ffffff',
                    border: 'none',
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.35)'
                  } : {})
                }}
                onClick={() => { t.action!.onClick(); removeToast(t.id); }}
              >
                {t.action.label}
              </motion.button>
            )}
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--muted-foreground))', display: 'flex', padding: 2 }}
              onClick={() => removeToast(t.id)}
            >
              <X size={13} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
