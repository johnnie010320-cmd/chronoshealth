'use client';

import { AppShell } from '@/components/AppShell';
import { ResetPasswordForm } from '@/features/identity/PasswordResetForms';
import { useI18n } from '@/lib/i18n';

// 메일 링크 도착 페이지 — /reset-password?token=… (토큰은 클라이언트에서만 읽음, 정적 export).
export default function ResetPasswordPage() {
  const { t } = useI18n();
  return (
    <AppShell
      showBack
      backHref="/login"
      title={t.login.resetNewTitle}
      decoration="dots"
      hideBottomNav
    >
      <div className="mt-2 pb-8">
        <ResetPasswordForm />
      </div>
    </AppShell>
  );
}
