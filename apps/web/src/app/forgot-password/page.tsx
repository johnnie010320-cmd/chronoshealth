'use client';

import { AppShell } from '@/components/AppShell';
import { ForgotPasswordForm } from '@/features/identity/PasswordResetForms';
import { useI18n } from '@/lib/i18n';

// 비밀번호 재설정 링크 요청 — 로그인 화면 "비밀번호를 잊으셨나요?" 에서 진입.
export default function ForgotPasswordPage() {
  const { t } = useI18n();
  return (
    <AppShell
      showBack
      backHref="/login"
      title={t.login.resetTitle}
      decoration="dots"
      hideBottomNav
    >
      <div className="mt-2 pb-8">
        <ForgotPasswordForm />
      </div>
    </AppShell>
  );
}
