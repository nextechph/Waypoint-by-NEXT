import React, { useState, useEffect } from 'react';
import {
  Shield, User, Eye, Crown, Users, CheckCircle2, ArrowRight,
  Sparkles, Lock, Mail, AlertCircle, LogIn, Loader2
} from './ui/icons';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useWorkStore } from '../store/useWorkStore';
import { useToastStore } from '../store/useToastStore';
import { supabaseService } from '../services/supabaseService';
import { avatarInitials, uid } from '../utils';
import { MemberRole } from '../types';
import logoImg from '../assets/logo.png';
import OAuthButtons from './ui/OAuthButtons';

interface Props {
  boardId: string;
  role: MemberRole;
  onAcceptJoin: (boardId: string) => void;
  onDecline: () => void;
}

interface BoardMeta {
  id: string;
  name: string;
  color: string;
  createdBy: string;
  memberCount: number;
}

export default function InviteLandingPage({ boardId, role = 'member', onAcceptJoin, onDecline }: Props) {
  const currentUser = useAuthStore(s => s.user);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const signInWithEmail = useAuthStore(s => s.signInWithEmail);
  const signUpWithEmail = useAuthStore(s => s.signUpWithEmail);
  const showToast = useToastStore(s => s.showToast);
  const loadBoardsFromCloud = useWorkStore(s => s.loadBoardsFromCloud);

  const [boardMeta, setBoardMeta] = useState<BoardMeta | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Email form state if logged out
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Fetch board metadata
  useEffect(() => {
    let isMounted = true;
    async function fetchMeta() {
      setLoadingMeta(true);
      try {
        const meta = await supabaseService.getBoardMetadata(boardId);
        if (isMounted) {
          setBoardMeta(meta || {
            id: boardId,
            name: 'Collaborative Board',
            color: '#6366f1',
            createdBy: 'Waypoint Team',
            memberCount: 1,
          });
        }
      } catch (err) {
        console.warn('Failed to load board metadata:', err);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    }
    fetchMeta();
    return () => { isMounted = false; };
  }, [boardId]);

  const joinBoardFromCloud = useWorkStore(s => s.joinBoardFromCloud);

  const executeJoinForUser = async (targetUser: { name?: string; email: string; avatarUrl?: string }) => {
    if (!targetUser?.email) return;
    setIsJoining(true);
    try {
      const cleanEmail = targetUser.email.toLowerCase().trim();
      const userName = targetUser.name || cleanEmail.split('@')[0];

      // 1. Join board and directly retrieve board with all columns and tasks
      const joinedBoard = await joinBoardFromCloud(boardId, role || 'member', targetUser);

      // 2. Notify the creator in real-time
      if (boardMeta?.createdBy && boardMeta.createdBy.toLowerCase().trim() !== cleanEmail) {
        const creatorEmail = boardMeta.createdBy.toLowerCase().trim();
        try {
          await supabaseService.createNotification({
            id: uid(),
            recipientEmail: creatorEmail,
            title: 'New Member Joined!',
            sub: `${userName} joined "${boardMeta.name || 'Workspace Board'}" via invite link.`,
            icon: 'user-plus',
            cardId: null,
            boardId,
            time: new Date().toISOString(),
          });
          await supabaseService.broadcastUpdate('notifications', { recipientEmail: creatorEmail });
        } catch (nErr) {
          console.warn('Creator notification error:', nErr);
        }
      }

      // 3. Broadcast instant board update across all devices
      await supabaseService.broadcastUpdate('boards', { boardId, memberEmail: cleanEmail });

      // 4. Trigger accept callback
      onAcceptJoin(boardId);
      showToast(`Welcome to "${boardMeta?.name || joinedBoard?.name || 'the board'}"! You joined as ${role === 'admin' ? 'an Admin' : role === 'observer' ? 'an Observer' : 'a Member'}.`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to join board', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const handleJoin = async () => {
    if (currentUser) {
      await executeJoinForUser(currentUser);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('Please fill in your email and password', 'warning');
      return;
    }
    if (authMode === 'signup' && !name.trim()) {
      showToast('Please enter your full name', 'warning');
      return;
    }

    setAuthLoading(true);
    try {
      if (authMode === 'signin') {
        const res = await signInWithEmail(email.trim(), password);
        if (!res.success) {
          showToast(res.error || 'Sign in failed', 'error');
          setAuthLoading(false);
          return;
        }
        const loggedUser = useAuthStore.getState().user || { email: email.trim() };
        await executeJoinForUser(loggedUser);
      } else {
        const res = await signUpWithEmail(name.trim(), email.trim(), password);
        if (!res.success) {
          showToast(res.error || 'Sign up failed', 'error');
          setAuthLoading(false);
          return;
        }
        showToast('Account created! Joining board...', 'success');
        const loggedUser = useAuthStore.getState().user || { name: name.trim(), email: email.trim() };
        await executeJoinForUser(loggedUser);
      }
    } catch (err: any) {
      showToast(err.message || 'Authentication error', 'error');
    } finally {
      setAuthLoading(false);
    }
  };

  const roleConfigMap: Record<MemberRole, { label: string; badgeColor: string; badgeBg: string; icon: React.ReactNode; desc: string }> = {
    owner: {
      label: 'Board Owner',
      badgeColor: 'hsl(var(--primary))',
      badgeBg: 'hsl(var(--primary) / 0.15)',
      icon: <Crown size={16} />,
      desc: 'Complete control over board ownership, permissions, and settings.',
    },
    admin: {
      label: 'Admin (Co-Manager)',
      badgeColor: 'hsl(var(--primary))',
      badgeBg: 'hsl(var(--primary) / 0.15)',
      icon: <Shield size={16} />,
      desc: 'You can assign tasks, manage board members, edit columns, and configure settings.',
    },
    member: {
      label: 'Member',
      badgeColor: 'hsl(142 76% 36%)',
      badgeBg: 'hsl(142 76% 36% / 0.15)',
      icon: <User size={16} />,
      desc: 'You can complete assigned cards, edit details, move tasks, and post comments.',
    },
    observer: {
      label: 'Observer (View Only)',
      badgeColor: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.15)',
      icon: <Eye size={16} />,
      desc: 'Read-only access — view board progress, check task details, and post comments.',
    },
  };

  const roleConfig = roleConfigMap[role] || roleConfigMap['member'];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        width: '100vw',
        backgroundColor: 'hsl(var(--background))',
        padding: 20,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow auras */}
      <div
        style={{
          position: 'absolute',
          width: 450,
          height: 450,
          borderRadius: '50%',
          background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
          top: '20%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="modal"
        style={{
          maxWidth: 480,
          boxShadow: 'var(--neu-shadow-floating)',
          border: '1px solid hsl(var(--border) / 0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Top Branding */}
        <div style={{ padding: '26px 28px 18px 28px', textAlign: 'center', borderBottom: '1px solid hsl(var(--border) / 0.6)' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
            <img src={logoImg} alt="Waypoint" style={{ width: 48, height: 48, objectFit: 'contain' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: 'hsl(var(--primary))', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            <Sparkles size={13} />
            <span>Board Invitation</span>
          </div>
          <h2 style={{ fontSize: 21, fontWeight: 800, margin: '6px 0 0 0', color: 'hsl(var(--foreground))', letterSpacing: '-0.3px' }}>
            You've Been Invited!
          </h2>
        </div>

        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Board Details Card */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: 14,
              backgroundColor: 'hsl(var(--card))',
              boxShadow: 'var(--neu-shadow-raised-sm)',
              border: '1px solid hsl(var(--border) / 0.7)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {loadingMeta ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0', gap: 8, color: 'hsl(var(--muted-foreground))', fontSize: 12 }}>
                <Loader2 size={16} className="animate-spin" />
                <span>Loading board details...</span>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        backgroundColor: boardMeta?.color || '#6366f1',
                        display: 'inline-block',
                        boxShadow: `0 0 8px ${boardMeta?.color || '#6366f1'}88`,
                      }}
                    />
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--foreground))' }}>
                      {boardMeta?.name || 'Workspace Board'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>
                    <Users size={12} />
                    <span>{boardMeta?.memberCount || 1} members</span>
                  </div>
                </div>

                <div style={{ fontSize: 11.5, color: 'hsl(var(--muted-foreground))' }}>
                  Created & managed by <strong style={{ color: 'hsl(var(--foreground))' }}>{boardMeta?.createdBy}</strong>
                </div>
              </>
            )}
          </div>

          {/* Assigned Role Card */}
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 12,
              backgroundColor: 'hsl(var(--muted) / 0.3)',
              border: `1px solid ${roleConfig.badgeColor}33`,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'hsl(var(--muted-foreground))' }}>Your Assigned Role</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 9px',
                  borderRadius: 9999,
                  backgroundColor: roleConfig.badgeBg,
                  color: roleConfig.badgeColor,
                  fontSize: 11.5,
                  fontWeight: 700,
                }}
              >
                {roleConfig.icon}
                <span>{roleConfig.label}</span>
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 11.5, color: 'hsl(var(--foreground))', lineHeight: 1.45, opacity: 0.85 }}>
              {roleConfig.desc}
            </p>
          </div>

          {/* Authenticated User Status vs Logged Out Form */}
          {isAuthenticated && currentUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 10,
                  backgroundColor: 'hsl(var(--card))',
                  boxShadow: 'var(--neu-shadow-input)',
                }}
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      backgroundColor: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary-foreground))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {avatarInitials(currentUser.name || currentUser.email)}
                  </div>
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'hsl(var(--foreground))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentUser.name || currentUser.email.split('@')[0]}
                  </div>
                  <div style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentUser.email}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'hsl(142 76% 36%)', fontSize: 11, fontWeight: 700 }}>
                  <CheckCircle2 size={14} />
                  <span>Ready</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  className="btn btn-primary"
                  onClick={handleJoin}
                  disabled={isJoining}
                  style={{
                    height: 44,
                    fontSize: 14,
                    fontWeight: 700,
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: 'var(--neu-shadow-raised)',
                  }}
                >
                  {isJoining ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  <span>{isJoining ? 'Enrolling into Board...' : 'Accept & Join Board'}</span>
                </motion.button>

                <button
                  type="button"
                  onClick={onDecline}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'hsl(var(--muted-foreground))',
                    fontSize: 12,
                    cursor: 'pointer',
                    padding: '6px 0',
                    textAlign: 'center',
                  }}
                >
                  Decline & Go to Workspace Overview
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))', textAlign: 'center' }}>
                Sign in with Google, Apple, Microsoft or your Waypoint account to join this board.
              </div>

              {/* Social sign-in: one button per provider */}
              <OAuthButtons disabled={authLoading} onBusyChange={setAuthLoading} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 1, backgroundColor: 'hsl(var(--border))' }} />
                <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))' }}>or with email</span>
                <div style={{ flex: 1, height: 1, backgroundColor: 'hsl(var(--border))' }} />
              </div>

              {/* Email Form */}
              <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {authMode === 'signup' && (
                  <input
                    type="text"
                    className="text-input"
                    placeholder="Full Name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                )}
                <input
                  type="email"
                  className="text-input"
                  placeholder="Email Address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <input
                  type="password"
                  className="text-input"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="submit"
                  disabled={authLoading}
                  className="btn btn-primary"
                  style={{ height: 40, justifyContent: 'center', fontSize: 13, fontWeight: 700, gap: 6, marginTop: 4 }}
                >
                  {authLoading ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
                  <span>{authMode === 'signin' ? 'Sign In & Join' : 'Create Account & Join'}</span>
                </motion.button>
              </form>

              <div style={{ textAlign: 'center', fontSize: 11.5 }}>
                <button
                  type="button"
                  onClick={() => setAuthMode(m => m === 'signin' ? 'signup' : 'signin')}
                  style={{ background: 'none', border: 'none', color: 'hsl(var(--primary))', cursor: 'pointer', fontWeight: 600 }}
                >
                  {authMode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
