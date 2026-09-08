'use client';

import { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Field, SettingsCard } from '../kit';
import { inputCls, type TT } from './shared';

/** Change dashboard password — fully independent: own state, own save trip. */
export function PasswordCard({ t }: { t: TT }) {
  // Password form
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [busy, setBusy] = useState(false);

  const savePassword = async () => {
    if (next !== confirmPw) {
      toast.error(t('passwordMismatch'));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/admin/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current, next }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        toast.success(t('passwordSaved'));
        setCurrent('');
        setNext('');
        setConfirmPw('');
      } else {
        toast.error(data.error ?? t('errorToast'));
      }
    } catch {
      toast.error(t('errorToast')); // round 19: network failure now toasts
    } finally {
      setBusy(false);
    }
  };

  return (
    <SettingsCard icon={KeyRound} title={t('changePassword')}>
      <div className="mt-4 space-y-3">
        <Field label={t('currentPassword')}>
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            className={inputCls}
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('newPassword')}>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              className={inputCls}
            />
          </Field>
          <Field label={t('confirmPassword')}>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
              className={inputCls}
            />
          </Field>
        </div>
        <button
          type="button"
          onClick={() => void savePassword()}
          disabled={busy || !current || next.length < 6 || next !== confirmPw}
          className="press inline-flex h-11 w-full items-center justify-center gap-2 rounded-none bg-sadn-plum-800 text-sm font-medium text-white shadow-md shadow-sadn-plum-800/25 transition-colors hover:bg-sadn-plum-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-8"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('save')}
        </button>
      </div>
    </SettingsCard>
  );
}
