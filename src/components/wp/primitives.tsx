import React from 'react';
import { motion } from 'framer-motion';
import type { Member } from '../../types';
import { avatarInitials } from '../../utils';
import { RevealLines, useAvatarGroup } from '../ui/transitions';

/* ── Eyebrow / section label ─────────────────────────────── */
export function Eyebrow({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div className="wp-eyebrow" style={style}>{children}</div>;
}

/* ── Progress bar ────────────────────────────────────────── */
export function ProgressBar({ value, color, height = 4 }: { value: number; color?: string; height?: number }) {
  return (
    <div className="wp-progress" style={{ height }}>
      <motion.div
        className="wp-progress-fill"
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
        style={color ? { backgroundColor: color } : undefined}
      />
    </div>
  );
}

/* ── Avatar + stack ──────────────────────────────────────── */
export function MemberAvatar({ member, size = 28, ring = true }: { member: Pick<Member, 'name' | 'avatarUrl' | 'color'>; size?: number; ring?: boolean }) {
  const style: React.CSSProperties = { width: size, height: size, fontSize: Math.max(8, size * 0.36) };
  return member.avatarUrl ? (
    <img className={`wp-avatar${ring ? ' ring' : ''}`} src={member.avatarUrl} alt={member.name} title={member.name} style={style} />
  ) : (
    <span className={`wp-avatar${ring ? ' ring' : ''}`} title={member.name} style={{ ...style, backgroundColor: member.color || 'hsl(var(--muted-foreground))' }}>
      {avatarInitials(member.name || '?')}
    </span>
  );
}

export function AvatarStack({ members, max = 3, size = 28, onClick }: { members: Member[]; max?: number; size?: number; onClick?: () => void }) {
  const group = useAvatarGroup();
  if (!members.length) return <span className="wp-muted-sm">—</span>;
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <span {...group.root} className={`wp-avatar-stack${onClick ? ' clickable' : ''}`} onClick={onClick} role={onClick ? 'button' : undefined}>
      {shown.map((m, i) => (
        <span key={m.id || m.email || m.name} {...group.item(i)}>
          <MemberAvatar member={m} size={size} />
        </span>
      ))}
      {extra > 0 && <span {...group.item(shown.length)} className="t-avatar wp-avatar ring more" style={{ width: size, height: size, fontSize: size * 0.34 }}>+{extra}</span>}
    </span>
  );
}

/* ── Tag pill ────────────────────────────────────────────── */
export function Tag({ children, color, icon }: { children: React.ReactNode; color?: string; icon?: React.ReactNode }) {
  return (
    <span className="wp-tag">
      {icon}
      {color && <span className="wp-tag-dot" style={{ backgroundColor: color }} />}
      {children}
    </span>
  );
}

/* ── Project glyph (line illustration) ───────────────────── */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Small line-drawn thumbnail for a project: a path, a flag, a target or a summit. */
export function ProjectGlyph({ id, color, size = 76, variant }: { id: string; color?: string; size?: number; variant?: number }) {
  const v = variant ?? hash(id) % 4;
  const accent = color || 'hsl(var(--foreground))';
  return (
    <span className="wp-glyph" style={{ width: size, height: size * 0.95 }}>
      <svg viewBox="0 0 80 76" width="100%" height="100%" fill="none" aria-hidden>
        {v === 0 && (
          <>
            <path d="M18 56 C 34 56, 30 26, 46 24 S 58 20, 62 18" stroke="hsl(var(--foreground) / 0.55)" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="18" cy="56" r="4" fill={accent} />
            <circle cx="62" cy="18" r="3" fill="hsl(var(--foreground))" />
          </>
        )}
        {v === 1 && (
          <>
            <path d="M14 60 C 22 44, 28 58, 36 46 M 44 40 C 50 32, 54 30, 58 24" stroke="hsl(var(--foreground) / 0.55)" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="0.5 0" />
            <circle cx="14" cy="60" r="2.2" fill="hsl(var(--foreground))" />
            <circle cx="40" cy="43" r="1.6" fill="hsl(var(--foreground) / 0.6)" />
            <path d="M58 24 L 58 12 L 68 18 Z" fill={accent} />
          </>
        )}
        {v === 2 && (
          <>
            <circle cx="40" cy="38" r="26" stroke="hsl(var(--foreground) / 0.18)" strokeWidth="1.2" />
            <circle cx="40" cy="38" r="17" stroke="hsl(var(--foreground) / 0.3)" strokeWidth="1.2" />
            <circle cx="40" cy="38" r="9" stroke="hsl(var(--foreground) / 0.45)" strokeWidth="1.2" />
            <circle cx="40" cy="38" r="4.5" fill={accent} />
          </>
        )}
        {v === 3 && (
          <>
            <path d="M6 60 L 30 32 L 42 44 L 54 26 L 74 60" stroke="hsl(var(--foreground) / 0.5)" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M54 26 L 54 14" stroke="hsl(var(--foreground) / 0.5)" strokeWidth="1" />
            <circle cx="54" cy="12" r="2.6" fill={accent} />
            <path d="M14 66 C 26 58, 40 64, 52 56" stroke="hsl(var(--foreground) / 0.3)" strokeWidth="1.2" strokeLinecap="round" />
          </>
        )}
      </svg>
    </span>
  );
}

/** Wide "summit" banner used as a project-card cover. */
export function SummitCover({ id, color, height = 92 }: { id: string; color?: string; height?: number }) {
  const h = hash(id);
  const peak = 70 + (h % 50);
  const summit = 170 + (h % 60);
  const accent = color || 'hsl(var(--foreground))';
  return (
    <div className="wp-summit" style={{ height }}>
      <svg viewBox="0 0 320 92" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden>
        <defs>
          <radialGradient id={`g-${id}`} cx={summit / 320} cy="0.35" r="0.55">
            <stop offset="0%" stopColor="hsl(var(--foreground))" stopOpacity="0.14" />
            <stop offset="100%" stopColor="hsl(var(--foreground))" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="320" height="92" fill={`url(#g-${id})`} />
        <path d={`M0 92 L0 66 Q ${peak * 0.6} 56 ${peak} 50 Q ${peak + 40} 58 ${peak + 90} 70 L 320 74 L320 92 Z`} fill="hsl(var(--foreground) / 0.06)" />
        <path d={`M0 92 L0 82 Q 70 74 ${summit - 48} 58 L ${summit} 32 L ${summit + 46} 60 Q 280 74 320 72 L 320 92 Z`} fill="hsl(var(--foreground) / 0.1)" />
        <path d={`M ${summit} 31 L ${summit} 16`} stroke="hsl(var(--foreground) / 0.45)" strokeWidth="0.7" />
        <circle cx={summit} cy="31" r="2.4" fill={accent} />
        <path d={`M 40 92 C 90 84, 120 86, ${summit - 20} 64`} stroke="hsl(var(--foreground) / 0.35)" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/* ── Empty state ─────────────────────────────────────────── */
export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="wp-empty">
      <ProjectGlyph id={title} variant={0} size={64} />
      <RevealLines className="wp-empty-text">
        <div className="wp-empty-title">{title}</div>
        {body && <div className="wp-empty-body">{body}</div>}
      </RevealLines>
      {action}
    </div>
  );
}
