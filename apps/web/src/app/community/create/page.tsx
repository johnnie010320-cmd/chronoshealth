'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import {
  createCommunity,
  type CommunityVisibility,
} from '@/lib/api-client';

export default function CreateCommunityPage() {
  const { t } = useI18n();
  const Co = t.community;
  const C = Co.create;
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<CommunityVisibility>('public');
  const [allowLikes, setAllowLikes] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errCode, setErrCode] = useState<string | null>(null);

  useEffect(() => {
    if (!readSession()) router.replace('/signup');
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrCode(null);
    try {
      const res = await createCommunity({
        name: name.trim(),
        description: description.trim(),
        visibility,
        allowLikesDefault: allowLikes,
        allowCommentsDefault: allowComments,
      });
      router.replace(`/community/view?id=${res.community.id}`);
    } catch (err) {
      setErrCode(err instanceof Error ? err.message : 'generic');
      setSubmitting(false);
    }
  }

  return (
    <AppShell title={C.pageTitle} showBack backHref="/community" decoration="dots">
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block">
          <span className="text-[12px] font-semibold text-stone-700 dark:text-stone-300">
            {C.nameLabel}
          </span>
          <input
            type="text"
            value={name}
            placeholder={C.namePlaceholder}
            maxLength={60}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>

        <label className="block">
          <span className="text-[12px] font-semibold text-stone-700 dark:text-stone-300">
            {C.descriptionLabel}
          </span>
          <textarea
            value={description}
            placeholder={C.descriptionPlaceholder}
            maxLength={500}
            rows={3}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full resize-none rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-[12px] font-semibold text-stone-700 dark:text-stone-300">
            {C.visibilityLabel}
          </legend>
          <VisibilityOption
            checked={visibility === 'public'}
            onChange={() => setVisibility('public')}
            title={C.visibilityPublicTitle}
            desc={C.visibilityPublicDesc}
          />
          <VisibilityOption
            checked={visibility === 'private'}
            onChange={() => setVisibility('private')}
            title={C.visibilityPrivateTitle}
            desc={C.visibilityPrivateDesc}
          />
        </fieldset>

        <div className="space-y-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900">
          <Toggle
            label={C.allowLikesDefault}
            checked={allowLikes}
            onChange={setAllowLikes}
          />
          <Toggle
            label={C.allowCommentsDefault}
            checked={allowComments}
            onChange={setAllowComments}
          />
        </div>

        {errCode && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
            {Co.error[errCode as keyof typeof Co.error] ?? Co.error.generic}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || name.trim() === ''}
          className="inline-flex w-full items-center justify-between rounded-2xl bg-stone-900 px-6 py-4 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-stone-900"
        >
          <span>{submitting ? C.submitting : C.submit}</span>
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </form>
    </AppShell>
  );
}

function VisibilityOption({
  checked,
  onChange,
  title,
  desc,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  desc: string;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
        checked
          ? 'border-brand-500 bg-brand-50/60 dark:border-brand-400 dark:bg-brand-900/30'
          : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900'
      }`}
    >
      <input
        type="radio"
        checked={checked}
        onChange={onChange}
        className="mt-1 h-4 w-4 accent-brand-600"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-stone-900 dark:text-stone-100">
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
          {desc}
        </span>
      </span>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-stone-800 dark:text-stone-200">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-brand-600"
      />
    </label>
  );
}
