'use client';

// 회원 탈퇴 (2026-11-08 죠니 — Play 데이터 보안 '계정 삭제 URL' = https://vitacodeapp.com/account-delete/).
// 공개 페이지: 로그인 안 했으면 무엇이 지워지는지 + 탈퇴 방법(로그인 → 이 화면), 로그인했으면 바로 탈퇴.
// 마이페이지 맨 아래 '회원 탈퇴'도 이리로 온다.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { useI18n, type Locale } from '@/lib/i18n';
import { readSession, clearSession } from '@/lib/session';
import { deleteMyAccount } from '@/lib/api-client';

type Dict = {
  title: string;
  lead: string;
  deletedTitle: string;
  deleted: string[];
  keptNote: string;
  howTitle: string;
  how: string[];
  login: string;
  warn: string;
  typeLabel: (word: string) => string;
  word: string;
  button: string;
  deleting: string;
  failed: string;
  adminBlocked: string;
};

const DICTS: Record<Locale, Dict> = {
  ko: {
    title: '회원 탈퇴',
    lead: 'VITAcode 계정과 그동안 남긴 기록을 모두 지웁니다. 지운 뒤에는 되돌릴 수 없습니다.',
    deletedTitle: '지워지는 정보',
    deleted: [
      '계정 정보: 이름·이메일·전화번호·출생 연도·성별·국적·프로필 사진·SNS 로그인 연결',
      '건강 기록: 설문 응답·AI 건강 리포트·VITA 결과·루틴·건강 일기·의료 기록과 첨부 파일',
      '커뮤니티·대화: 내가 쓴 글·댓글·좋아요·보낸 메시지와 첨부 파일',
      '그 밖: 기능 요청',
    ],
    keptNote: '탈퇴 즉시 지워집니다. 약관·개인정보 동의 기록과 보상 내역은 누구인지 알 수 없는 형태로만 남고, 관계 법령에 따라 보관이 필요한 정보는 정해진 기간 동안 보관합니다.',
    howTitle: '탈퇴 방법',
    how: ['VITAcode 앱 또는 vitacodeapp.com 에 로그인합니다.', '마이페이지 맨 아래 \'회원 탈퇴\'를 누릅니다.', '확인 글자를 입력하고 \'탈퇴하기\'를 누릅니다.'],
    login: '로그인하기',
    warn: '탈퇴하면 모든 기록이 바로 지워지고 되돌릴 수 없습니다.',
    typeLabel: (w) => `확인을 위해 '${w}'를 입력해 주세요`,
    word: '탈퇴',
    button: '탈퇴하기',
    deleting: '지우는 중…',
    failed: '탈퇴하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
    adminBlocked: '관리자 계정은 탈퇴할 수 없습니다. 관리 권한을 먼저 내려놓아 주세요.',
  },
  en: {
    title: 'Delete account',
    lead: 'This deletes your VITAcode account and everything you have recorded. It cannot be undone.',
    deletedTitle: 'What gets deleted',
    deleted: [
      'Account: name, email, phone number, birth year, sex, nationality, profile photo, social sign-in links',
      'Health records: survey answers, AI health reports, VITA results, routines, health diary, medical records and attachments',
      'Community & chats: your posts, comments, likes, sent messages and attachments',
      'Other: feature requests',
    ],
    keptNote: 'Data is deleted immediately. Consent records and reward history remain only in a form that cannot identify you, and information the law requires us to keep is retained for the required period.',
    howTitle: 'How to delete',
    how: ['Sign in to the VITAcode app or vitacodeapp.com.', 'Tap "Delete account" at the bottom of My page.', 'Type the confirmation word and tap "Delete".'],
    login: 'Sign in',
    warn: 'Deleting removes all your records immediately and cannot be undone.',
    typeLabel: (w) => `Type "${w}" to confirm`,
    word: 'DELETE',
    button: 'Delete',
    deleting: 'Deleting…',
    failed: 'Could not delete your account. Please try again later.',
    adminBlocked: 'Admin accounts cannot be deleted. Please give up admin rights first.',
  },
  ja: {
    title: '退会',
    lead: 'VITAcode のアカウントとこれまでの記録をすべて削除します。削除後は元に戻せません。',
    deletedTitle: '削除される情報',
    deleted: [
      'アカウント: 氏名・メール・電話番号・生年・性別・国籍・プロフィール写真・SNS ログイン連携',
      '健康記録: アンケート回答・AI 健康レポート・VITA 結果・ルーティン・健康日記・医療記録と添付ファイル',
      'コミュニティ・チャット: 自分の投稿・コメント・いいね・送信したメッセージと添付ファイル',
      'その他: 機能リクエスト',
    ],
    keptNote: '退会と同時に削除されます。規約・個人情報の同意記録と報酬履歴は個人を特定できない形でのみ残り、法令で保存が必要な情報は定められた期間保存します。',
    howTitle: '退会方法',
    how: ['VITAcode アプリまたは vitacodeapp.com にログインします。', 'マイページ一番下の「退会」を押します。', '確認の文字を入力し「退会する」を押します。'],
    login: 'ログイン',
    warn: '退会するとすべての記録がすぐに削除され、元に戻せません。',
    typeLabel: (w) => `確認のため「${w}」と入力してください`,
    word: '退会',
    button: '退会する',
    deleting: '削除中…',
    failed: '退会できませんでした。しばらくしてからもう一度お試しください。',
    adminBlocked: '管理者アカウントは退会できません。先に管理権限を外してください。',
  },
  es: {
    title: 'Eliminar cuenta',
    lead: 'Se eliminarán tu cuenta de VITAcode y todos tus registros. No se puede deshacer.',
    deletedTitle: 'Qué se elimina',
    deleted: [
      'Cuenta: nombre, correo, teléfono, año de nacimiento, sexo, nacionalidad, foto de perfil, inicios de sesión sociales',
      'Registros de salud: respuestas de encuestas, informes de salud con IA, resultados VITA, rutinas, diario de salud, historial médico y adjuntos',
      'Comunidad y chats: tus publicaciones, comentarios, me gusta, mensajes enviados y adjuntos',
      'Otros: solicitudes de funciones',
    ],
    keptNote: 'Los datos se eliminan de inmediato. Los registros de consentimiento y el historial de recompensas solo se conservan de forma que no te identifica, y la información que la ley obliga a guardar se conserva durante el plazo exigido.',
    howTitle: 'Cómo eliminarla',
    how: ['Inicia sesión en la app VITAcode o en vitacodeapp.com.', 'Pulsa "Eliminar cuenta" al final de Mi página.', 'Escribe la palabra de confirmación y pulsa "Eliminar".'],
    login: 'Iniciar sesión',
    warn: 'Al eliminar la cuenta, todos tus registros se borran de inmediato y no se pueden recuperar.',
    typeLabel: (w) => `Escribe "${w}" para confirmar`,
    word: 'ELIMINAR',
    button: 'Eliminar',
    deleting: 'Eliminando…',
    failed: 'No se pudo eliminar la cuenta. Inténtalo de nuevo más tarde.',
    adminBlocked: 'Las cuentas de administrador no se pueden eliminar. Renuncia primero a los permisos de administrador.',
  },
};

export default function AccountDeletePage() {
  const { locale } = useI18n();
  const d = DICTS[locale];
  const [loggedIn, setLoggedIn] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoggedIn(readSession() !== null);
  }, []);

  async function onDelete() {
    if (busy || typed.trim() !== d.word) return;
    // 마지막 확인 창 — 되돌릴 수 없는 작업
    if (!window.confirm(d.warn)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteMyAccount();
      clearSession();
      window.location.assign('/welcome/?deleted=1');
    } catch (e) {
      setError(e instanceof Error && e.message === 'ADMIN_CANNOT_DELETE' ? d.adminBlocked : d.failed);
      setBusy(false);
    }
  }

  return (
    <AppShell title={d.title} decoration="dots">
      {/* 일본어는 띄어쓰기가 없어 전역 keep-all 이면 문장째 다음 줄로 넘어간다 */}
      <div className="space-y-4 pb-28" style={locale === 'ja' ? { wordBreak: 'normal' } : undefined}>
        <p className="text-[14px] leading-relaxed text-stone-700 dark:text-stone-300">{d.lead}</p>

        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
          <h2 className="mb-2 text-[15px] font-bold">{d.deletedTitle}</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed text-stone-700 dark:text-stone-300">
            {d.deleted.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-stone-500 dark:text-stone-400">{d.keptNote}</p>
        </section>

        {loggedIn ? (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/40">
            <p className="text-[13px] font-semibold text-rose-700 dark:text-rose-300">{d.warn}</p>
            <label className="mt-3 block text-[13px] text-stone-700 dark:text-stone-300">
              {d.typeLabel(d.word)}
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-[15px] dark:border-stone-700 dark:bg-stone-900"
                autoComplete="off"
              />
            </label>
            {error && <p className="mt-2 text-[13px] text-rose-700 dark:text-rose-300">{error}</p>}
            <button
              type="button"
              onClick={() => void onDelete()}
              disabled={busy || typed.trim() !== d.word}
              className="mt-3 w-full rounded-2xl bg-rose-600 px-4 py-3 text-[15px] font-bold text-white transition active:scale-[0.99] disabled:opacity-40"
            >
              {busy ? d.deleting : d.button}
            </button>
          </section>
        ) : (
          <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900">
            <h2 className="mb-2 text-[15px] font-bold">{d.howTitle}</h2>
            <ol className="list-decimal space-y-1.5 pl-5 text-[13px] leading-relaxed text-stone-700 dark:text-stone-300">
              {d.how.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ol>
            <Link
              href="/login/"
              className="mt-4 block w-full rounded-2xl bg-stone-900 px-4 py-3 text-center text-[15px] font-bold text-white dark:bg-white dark:text-stone-900"
            >
              {d.login}
            </Link>
          </section>
        )}
      </div>
    </AppShell>
  );
}
