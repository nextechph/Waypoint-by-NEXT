import React, { useState } from 'react';
import {
  ArrowRight, Eye, EyeOff, Sun, Moon, Loader2, Mail, KeyRound, CheckCircle2, RotateCcw, ArrowLeft
} from './ui/glyphs';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import { useToastStore } from '../store/useToastStore';
import { useThemeStore } from '../store/useThemeStore';
import heroImg from '../assets/login-hero.jpg';
import wordmarkDark from '../assets/wordmark-dark.png';
import wordmarkLight from '../assets/wordmark-light.png';

export default function LoginPage() {
  const signInWithEmail = useAuthStore(s => s.signInWithEmail);
  const signUpWithEmail = useAuthStore(s => s.signUpWithEmail);
  const verifyEmailOtp = useAuthStore(s => s.verifyEmailOtp);
  const resendVerificationOtp = useAuthStore(s => s.resendVerificationOtp);
  const sendPasswordReset = useAuthStore(s => s.sendPasswordReset);
  const verifyRecoveryOtp = useAuthStore(s => s.verifyRecoveryOtp);
  const updatePassword = useAuthStore(s => s.updatePassword);
  const signInWithGoogle = useAuthStore(s => s.signInWithGoogle);
  const showToast = useToastStore(s => s.showToast);
  const isDark = useThemeStore(s => s.isDark);
  const toggleTheme = useThemeStore(s => s.toggle);

  const [mode, setMode] = useState<'signin' | 'signup' | 'verify-email' | 'forgot-password' | 'reset-new-password'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // 1. Handle Submit for Sign In / Sign Up
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      showToast('Please enter your email and password', 'warning');
      return;
    }

    if (mode === 'signup' && !name.trim()) {
      showToast('Please enter your full name', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signin') {
        const res = await signInWithEmail(email.trim(), password);
        if (!res.success) {
          showToast(res.error || 'Sign in failed', 'error');
          setIsLoading(false);
          return;
        }
        showToast('Welcome back to Waypoint!', 'success');
      } else {
        const res = await signUpWithEmail(name.trim(), email.trim(), password);
        if (!res.success) {
          showToast(res.error || 'Sign up failed', 'error');
          setIsLoading(false);
          return;
        }
        if (res.requiresVerification) {
          showToast('Verification code sent! Please verify your email.', 'info');
          setMode('verify-email');
        } else {
          showToast('Account created and signed in!', 'success');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Authentication error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Email Verification Code (OTP)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      showToast('Please enter the 6-digit verification code', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const res = await verifyEmailOtp(email.trim(), otpCode.trim());
      if (!res.success) {
        showToast(res.error || 'Invalid or expired verification code', 'error');
        setIsLoading(false);
        return;
      }
      showToast('Email verified successfully! Welcome to Waypoint.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Verification error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle Resend Verification Code
  const handleResendOtp = async () => {
    if (!email.trim()) return;
    setIsLoading(true);
    try {
      const res = await resendVerificationOtp(email.trim());
      if (res.success) {
        showToast('A new verification code has been sent to your email', 'success');
      } else {
        showToast(res.error || 'Failed to resend code', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error resending code', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Handle Forgot Password
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      showToast('Please enter your email address', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const res = await sendPasswordReset(email.trim());
      if (!res.success) {
        showToast(res.error || 'Failed to send password reset code', 'error');
        setIsLoading(false);
        return;
      }
      showToast('Password reset code sent to your email!', 'success');
      setMode('reset-new-password');
    } catch (err: any) {
      showToast(err.message || 'Error sending reset email', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Handle Reset New Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || !newPassword.trim()) {
      showToast('Please enter the recovery code and new password', 'warning');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'warning');
      return;
    }

    setIsLoading(true);
    try {
      const verifyRes = await verifyRecoveryOtp(email.trim(), otpCode.trim());
      if (!verifyRes.success) {
        showToast(verifyRes.error || 'Invalid recovery code', 'error');
        setIsLoading(false);
        return;
      }

      const updateRes = await updatePassword(newPassword.trim());
      if (!updateRes.success) {
        showToast(updateRes.error || 'Failed to set new password', 'error');
        setIsLoading(false);
        return;
      }

      showToast('Password reset successfully! You can now sign in.', 'success');
      setMode('signin');
      setPassword(newPassword);
      setOtpCode('');
      setNewPassword('');
    } catch (err: any) {
      showToast(err.message || 'Password reset error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Handle Google OAuth
  const handleGoogleClick = async () => {
    setIsLoading(true);
    try {
      const res = await signInWithGoogle();
      if (!res.success) {
        showToast(res.error || 'Google Sign In failed', 'error');
        setIsLoading(false);
      }
    } catch (err: any) {
      showToast(err.message || 'Google Auth error', 'error');
      setIsLoading(false);
    }
  };

  // Input Style Helpers
  const getInputStyle = (fieldName: string) => ({
    width: '100%',
    height: 44,
    padding: fieldName === 'password' || fieldName === 'newPassword' ? '0 40px 0 14px' : '0 14px',
    borderRadius: 10,
    fontSize: 13.5,
    outline: 'none',
    backgroundColor: 'hsl(var(--card))',
    color: 'hsl(var(--foreground))',
    boxShadow: focusedField === fieldName ? '0 0 0 3px hsl(var(--foreground) / 0.08)' : 'none',
    border: focusedField === fieldName
      ? '1px solid hsl(var(--foreground) / 0.55)'
      : '1px solid hsl(var(--input))',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  });

  // 3D Motion Variants for screens
  const screenVariants = {
    initial: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? 30 : -30,
      rotateY: direction > 0 ? 12 : -12,
      scale: 0.97,
    }),
    animate: {
      opacity: 1,
      x: 0,
      rotateY: 0,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 260,
        damping: 24,
      },
    },
    exit: (direction: number) => ({
      opacity: 0,
      x: direction > 0 ? -30 : 30,
      rotateY: direction > 0 ? -12 : 12,
      scale: 0.97,
      transition: {
        duration: 0.2,
        ease: 'easeIn' as const,
      },
    }),
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100dvh',
        width: '100vw',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: 'hsl(var(--background))',
        transition: 'background-color 0.4s ease',
      }}
    >
      {/* ── Left Side Brand Showcase (Visible on Desktop/Tablet) ── */}
      <div
        className="hide-on-mobile"
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#0F1115',
          padding: '48px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          color: '#FFFFFF',
        }}
      >
        <motion.img
          src={heroImg}
          alt=""
          aria-hidden
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: '62% 70%',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(15,17,21,0.92) 0%, rgba(15,17,21,0.35) 38%, rgba(15,17,21,0.15) 62%, rgba(15,17,21,0.85) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top Left Brand */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <img src={wordmarkDark} alt="Waypoint" style={{ height: 30, width: 'auto', objectFit: 'contain' }} />
          <span style={{ fontSize: 10.5, letterSpacing: '0.38em', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', fontWeight: 500 }}>
            By Next Technology
          </span>
        </div>

        {/* Hero Narrative Copy */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          style={{ position: 'relative', maxWidth: 520 }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 44,
              fontWeight: 500,
              lineHeight: 1.12,
              letterSpacing: '-0.025em',
              marginBottom: 16,
              color: '#FFFFFF',
            }}
          >
            Your work.<br />
            <span
              style={{
                background: 'linear-gradient(90deg, #FFFFFF 0%, #9CA3AF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Your direction.
            </span>
          </h2>
          <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.68)', lineHeight: 1.65 }}>
            Plan your tasks. Track your progress.<br />Reach what’s next.
          </p>
        </motion.div>

        {/* Footer Note */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          <span>© {new Date().getFullYear()} Waypoint by Next Technology</span>
          <span style={{ letterSpacing: '0.04em' }}>Modern · Minimal · Focused</span>
        </div>
      </div>

      {/* ── Right Side Full-Height Login Panel ── */}
      <motion.div
        className="login-right-panel"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: 480,
          minHeight: '100dvh',
          backgroundColor: 'hsl(var(--background))',
          borderLeft: '1px solid hsl(var(--border))',
          position: 'relative',
          zIndex: 20,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '36px 40px',
          overflowY: 'auto',
          perspective: 1200,
        }}
      >
        {/* Panel Top Header: Centered Theme Switcher */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <motion.div
            whileTap={{ scale: 0.96 }}
            onClick={toggleTheme}
            role="button"
            tabIndex={0}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
            style={{
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              padding: 4,
              borderRadius: 9999,
              backgroundColor: 'hsl(var(--muted))',
              border: '1px solid hsl(var(--border))',
              userSelect: 'none',
              transition: 'background-color 0.25s ease',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 11px',
                borderRadius: 9999,
                fontSize: 11.5,
                fontWeight: 600,
                color: !isDark ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                backgroundColor: !isDark ? 'hsl(var(--card))' : 'transparent',
                boxShadow: !isDark ? 'var(--neu-shadow-raised-sm)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <Sun size={12} color={!isDark ? '#f59e0b' : 'currentColor'} />
              <span>Light</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 11px',
                borderRadius: 9999,
                fontSize: 11.5,
                fontWeight: 600,
                color: isDark ? 'hsl(var(--primary-foreground))' : 'hsl(var(--muted-foreground))',
                backgroundColor: isDark ? 'hsl(var(--primary))' : 'transparent',
                boxShadow: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <Moon size={12} color={isDark ? 'hsl(var(--primary-foreground))' : 'currentColor'} />
              <span>Dark</span>
            </div>
          </motion.div>
        </div>

        {/* Main 3D Animated Form Center Area */}
        <div style={{ margin: 'auto 0', padding: '12px 0', transformStyle: 'preserve-3d' }}>
          <AnimatePresence mode="wait" initial={false}>
            {/* ── SCREEN 1 & 2: SIGN IN / CREATE ACCOUNT ── */}
            {(mode === 'signin' || mode === 'signup') && (
              <motion.div
                key="auth-main"
                custom={mode === 'signup' ? 1 : -1}
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                style={{ display: 'flex', flexDirection: 'column', gap: 20, transformStyle: 'preserve-3d' }}
              >
                {/* Header Typography with smooth text change */}
                <div>
                  <img
                    className="show-on-mobile"
                    src={isDark ? wordmarkDark : wordmarkLight}
                    alt="Waypoint"
                    style={{ height: 26, width: 'auto', marginBottom: 22 }}
                  />
                  <motion.h1
                    key={mode === 'signin' ? 'title-signin' : 'title-signup'}
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color: 'hsl(var(--foreground))',
                      letterSpacing: '-0.03em',
                      margin: 0,
                    }}
                  >
                    {mode === 'signin' ? 'Welcome to Waypoint' : 'Create your account'}
                  </motion.h1>
                  <p
                    style={{
                      fontSize: 13.5,
                      color: 'hsl(var(--muted-foreground))',
                      marginTop: 6,
                      marginBottom: 0,
                      lineHeight: 1.45,
                    }}
                  >
                    {mode === 'signin'
                      ? 'Sign in to access your agile boards, tasks & team workspace'
                      : 'Sign up to start organizing projects and sprints'}
                  </p>
                </div>

                {/* Inset Segmented Mode Tabs with Sliding Pill */}
                <div
                  style={{
                    display: 'flex',
                    padding: 4,
                    borderRadius: 12,
                    backgroundColor: 'hsl(var(--muted))',
                    boxShadow: 'none',
                    border: '1px solid hsl(var(--border))',
                    position: 'relative',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    style={{
                      flex: 1,
                      padding: '7px 0',
                      borderRadius: 9,
                      fontSize: 13,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      zIndex: 2,
                      backgroundColor: 'transparent',
                      color: mode === 'signin' ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                      transition: 'color 0.2s ease',
                    }}
                  >
                    {mode === 'signin' && (
                      <motion.div
                        layoutId="active-auth-tab"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 9,
                          backgroundColor: 'hsl(var(--card))',
                          boxShadow: 'var(--neu-shadow-raised-sm)',
                          zIndex: -1,
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    style={{
                      flex: 1,
                      padding: '7px 0',
                      borderRadius: 9,
                      fontSize: 13,
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      zIndex: 2,
                      backgroundColor: 'transparent',
                      color: mode === 'signup' ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))',
                      transition: 'color 0.2s ease',
                    }}
                  >
                    {mode === 'signup' && (
                      <motion.div
                        layoutId="active-auth-tab"
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: 9,
                          backgroundColor: 'hsl(var(--card))',
                          boxShadow: 'var(--neu-shadow-raised-sm)',
                          zIndex: -1,
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    Create Account
                  </button>
                </div>

                {/* Raised Google Auth Button */}
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98, y: 1 }}
                  type="button"
                  onClick={handleGoogleClick}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    height: 44,
                    borderRadius: 12,
                    fontSize: 13.5,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    backgroundColor: 'hsl(var(--card))',
                    color: 'hsl(var(--foreground))',
                    boxShadow: 'none',
                    border: '1px solid hsl(var(--input))',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>{mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}</span>
                </motion.button>

                {/* Minimalist Hairline Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1, height: 1, backgroundColor: 'hsl(var(--border) / 0.7)' }} />
                  <span style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', fontWeight: 600, letterSpacing: '0.06em' }}>
                    OR WITH EMAIL
                  </span>
                  <div style={{ flex: 1, height: 1, backgroundColor: 'hsl(var(--border) / 0.7)' }} />
                </div>

                {/* Email & Password Form */}
                <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <AnimatePresence initial={false}>
                    {mode === 'signup' && (
                      <motion.div
                        key="name-field"
                        initial={{ opacity: 0, height: 0, y: -10 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: -10 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        style={{ display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}
                      >
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                          Full Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Alex Rivera"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          onFocus={() => setFocusedField('name')}
                          onBlur={() => setFocusedField(null)}
                          required={mode === 'signup'}
                          style={getInputStyle('name')}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="alex@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      required
                      style={getInputStyle('email')}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                        Password
                      </label>
                      {mode === 'signin' && (
                        <motion.button
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          style={{
                            background: 'none',
                            border: 'none',
                            fontSize: 11.5,
                            color: 'hsl(var(--primary))',
                            cursor: 'pointer',
                            fontWeight: 600,
                            padding: 0,
                          }}
                          onClick={() => setMode('forgot-password')}
                        >
                          Forgot password?
                        </motion.button>
                      )}
                    </div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        required
                        style={getInputStyle('password')}
                      />
                      <button
                        type="button"
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'hsl(var(--muted-foreground))',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          padding: 0,
                        }}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98, y: 1 }}
                    type="submit"
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      height: 44,
                      marginTop: 6,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      background: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary-foreground))',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                      border: '1px solid hsl(var(--primary))',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <span>{mode === 'signin' ? 'Sign In to Workspace' : 'Continue to Verification'}</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}

            {/* ── SCREEN 3: EMAIL VERIFICATION / OTP STEP ── */}
            {mode === 'verify-email' && (
              <motion.div
                key="auth-verify"
                custom={1}
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                style={{ display: 'flex', flexDirection: 'column', gap: 18, transformStyle: 'preserve-3d' }}
              >
                <div style={{ textAlign: 'center' }}>
                  <motion.div
                    initial={{ scale: 0.5, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', damping: 15 }}
                    style={{
                      width: 54,
                      height: 54,
                      borderRadius: 14,
                      backgroundColor: 'hsl(var(--card))',
                      boxShadow: 'var(--neu-shadow-raised)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Mail size={26} color="hsl(var(--primary))" />
                  </motion.div>
                  <h1
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: 'hsl(var(--foreground))',
                      letterSpacing: '-0.03em',
                      margin: 0,
                    }}
                  >
                    Verify your email
                  </h1>
                  <p
                    style={{
                      fontSize: 13,
                      color: 'hsl(var(--muted-foreground))',
                      marginTop: 6,
                      lineHeight: 1.5,
                    }}
                  >
                    We sent a 6-digit confirmation code and link to <br />
                    <strong style={{ color: 'hsl(var(--foreground))' }}>{email}</strong>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))', textAlign: 'center' }}>
                      Enter 6-Digit Code
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      placeholder="123456"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\s/g, ''))}
                      autoFocus
                      required
                      style={{
                        height: 50,
                        padding: '0 14px',
                        borderRadius: 12,
                        fontSize: 20,
                        fontWeight: 700,
                        letterSpacing: '0.25em',
                        textAlign: 'center',
                        outline: 'none',
                        backgroundColor: 'hsl(var(--background))',
                        color: 'hsl(var(--foreground))',
                        boxShadow: '0 0 0 3px hsl(var(--foreground) / 0.08)',
                        border: '1px solid hsl(var(--primary) / 0.6)',
                      }}
                    />
                  </div>

                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98, y: 1 }}
                    type="submit"
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      height: 44,
                      marginTop: 4,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      background: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary-foreground))',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                      border: 'none',
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify & Enter Workspace</span>
                        <CheckCircle2 size={16} />
                      </>
                    )}
                  </motion.button>
                </form>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'hsl(var(--primary))',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: 0,
                    }}
                  >
                    <RotateCcw size={12} />
                    <span>Resend code</span>
                  </motion.button>

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => setMode('signup')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'hsl(var(--muted-foreground))',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Change Email
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ── SCREEN 4: FORGOT PASSWORD (REQUEST CODE) ── */}
            {mode === 'forgot-password' && (
              <motion.div
                key="auth-forgot"
                custom={1}
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                style={{ display: 'flex', flexDirection: 'column', gap: 18, transformStyle: 'preserve-3d' }}
              >
                <div>
                  <motion.button
                    whileHover={{ x: -2 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => setMode('signin')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'hsl(var(--muted-foreground))',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12.5,
                      fontWeight: 600,
                      padding: 0,
                      marginBottom: 12,
                    }}
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Sign In</span>
                  </motion.button>
                  <h1
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: 'hsl(var(--foreground))',
                      letterSpacing: '-0.03em',
                      margin: 0,
                    }}
                  >
                    Reset password
                  </h1>
                  <p
                    style={{
                      fontSize: 13,
                      color: 'hsl(var(--muted-foreground))',
                      marginTop: 6,
                      lineHeight: 1.45,
                    }}
                  >
                    Enter your email address and we will send you a recovery code to set a new password.
                  </p>
                </div>

                <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                      Your Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="alex@company.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      required
                      style={getInputStyle('email')}
                    />
                  </div>

                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98, y: 1 }}
                    type="submit"
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      height: 44,
                      marginTop: 4,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      background: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary-foreground))',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                      border: 'none',
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Sending code...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Recovery Code</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}

            {/* ── SCREEN 5: SET NEW PASSWORD WITH OTP ── */}
            {mode === 'reset-new-password' && (
              <motion.div
                key="auth-reset-pass"
                custom={1}
                variants={screenVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                style={{ display: 'flex', flexDirection: 'column', gap: 18, transformStyle: 'preserve-3d' }}
              >
                <div>
                  <motion.button
                    whileHover={{ x: -2 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={() => setMode('signin')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'hsl(var(--muted-foreground))',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: 12.5,
                      fontWeight: 600,
                      padding: 0,
                      marginBottom: 12,
                    }}
                  >
                    <ArrowLeft size={14} />
                    <span>Back to Sign In</span>
                  </motion.button>
                  <h1
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: 'hsl(var(--foreground))',
                      letterSpacing: '-0.03em',
                      margin: 0,
                    }}
                  >
                    Set new password
                  </h1>
                  <p
                    style={{
                      fontSize: 13,
                      color: 'hsl(var(--muted-foreground))',
                      marginTop: 6,
                      lineHeight: 1.45,
                    }}
                  >
                    Enter the recovery code sent to <strong style={{ color: 'hsl(var(--foreground))' }}>{email}</strong> and your new password.
                  </p>
                </div>

                <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                      Recovery Code (from email)
                    </label>
                    <input
                      type="text"
                      placeholder="123456"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\s/g, ''))}
                      onFocus={() => setFocusedField('otp')}
                      onBlur={() => setFocusedField(null)}
                      required
                      style={getInputStyle('otp')}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      onFocus={() => setFocusedField('newPassword')}
                      onBlur={() => setFocusedField(null)}
                      required
                      style={getInputStyle('newPassword')}
                    />
                  </div>

                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.98, y: 1 }}
                    type="submit"
                    disabled={isLoading}
                    style={{
                      width: '100%',
                      height: 44,
                      marginTop: 4,
                      borderRadius: 12,
                      fontSize: 14,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      cursor: 'pointer',
                      background: 'hsl(var(--primary))',
                      color: 'hsl(var(--primary-foreground))',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                      border: 'none',
                    }}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span>Updating password...</span>
                      </>
                    ) : (
                      <>
                        <span>Set New Password & Sign In</span>
                        <KeyRound size={15} />
                      </>
                    )}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
