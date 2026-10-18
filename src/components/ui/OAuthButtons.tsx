import React, { useState } from 'react';
import { useAuthStore, OAUTH_PROVIDER_LABEL, type OAuthProvider } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';

const MARKS: Record<OAuthProvider, React.ReactNode> = {
  google: (
    <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
    </svg>
  ),
  apple: (
    <svg width="16" height="17" viewBox="0 0 384 470" aria-hidden fill="currentColor">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  ),
  azure: (
    <svg width="16" height="16" viewBox="0 0 23 23" aria-hidden>
      <path fill="#F35325" d="M1 1h10v10H1z" />
      <path fill="#81BC06" d="M12 1h10v10H12z" />
      <path fill="#05A6F0" d="M1 12h10v10H1z" />
      <path fill="#FFBA08" d="M12 12h10v10H12z" />
    </svg>
  ),
};

interface Props {
  disabled?: boolean;
  onBusyChange?: (busy: boolean) => void;
  providers?: OAuthProvider[];
}

/** Separate sign-in buttons for Google, Apple and Microsoft (Supabase OAuth). */
export default function OAuthButtons({ disabled, onBusyChange, providers = ['google', 'apple', 'azure'] }: Props) {
  const signInWithOAuth = useAuthStore(s => s.signInWithOAuth);
  const showToast = useToastStore(s => s.showToast);
  const [busy, setBusy] = useState<OAuthProvider | null>(null);

  const start = async (provider: OAuthProvider) => {
    setBusy(provider);
    onBusyChange?.(true);
    try {
      const res = await signInWithOAuth(provider);
      if (!res.success) showToast(res.error || `${OAUTH_PROVIDER_LABEL[provider]} sign-in failed`, 'error');
      else return; // the browser is redirecting to the provider
    } catch (err: any) {
      showToast(err?.message || `${OAUTH_PROVIDER_LABEL[provider]} sign-in failed`, 'error');
    }
    setBusy(null);
    onBusyChange?.(false);
  };

  return (
    <div className="wp-oauth">
      {providers.map(p => (
        <button
          key={p}
          type="button"
          className="wp-oauth-btn"
          onClick={() => start(p)}
          disabled={disabled || busy !== null}
          aria-label={`Continue with ${OAUTH_PROVIDER_LABEL[p]}`}
        >
          {MARKS[p]}
          <span>{busy === p ? 'Redirecting…' : `Continue with ${OAUTH_PROVIDER_LABEL[p]}`}</span>
        </button>
      ))}
    </div>
  );
}
