'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { ChevronRightIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import { createCommunityPost } from '@/lib/api-client';

function NewCommunityPostInner() {
  const { t } = useI18n();
  const Co = t.community;
  const PO = Co.postOptions;
  const router = useRouter();
  const params = useSearchParams();
  const communityId = params?.get('cid') ?? '_lounge';
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [snsUrl, setSnsUrl] = useState('');
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [allowLikes, setAllowLikes] = useState(true);
  const [allowComments, setAllowComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errCode, setErrCode] = useState<string | null>(null);

  useEffect(() => {
    if (!readSession()) {
      router.replace('/signup');
    }
  }, [router]);

  async function handleImage(file: File | null) {
    if (!file) return;
    setErrCode(null);
    setImageBusy(true);
    try {
      const b64 = await fileToImageB64(file);
      setImageB64(b64);
      setImagePreview(`data:image/jpeg;base64,${b64}`);
    } catch {
      setErrCode('generic');
    } finally {
      setImageBusy(false);
    }
  }

  function removeImage() {
    setImageB64(null);
    setImagePreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrCode(null);
    try {
      const res = await createCommunityPost({
        communityId,
        title: title.trim(),
        body: body.trim(),
        videoUrl: videoUrl.trim() === '' ? null : videoUrl.trim(),
        snsUrl: snsUrl.trim() === '' ? null : snsUrl.trim(),
        imageB64,
        imageMime: imageB64 ? 'image/jpeg' : null,
        allowLikes,
        allowComments,
      });
      router.replace(`/community/post?id=${res.post.id}`);
    } catch (err) {
      const code = err instanceof Error ? err.message : 'generic';
      setErrCode(code);
      setSubmitting(false);
    }
  }

  const backHref =
    communityId === '_lounge' ? '/community' : `/community/view?id=${communityId}`;

  return (
    <AppShell title={Co.new.pageTitle} showBack backHref={backHref} decoration="dots">
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <Field
          label={Co.new.titleField.label}
          placeholder={Co.new.titleField.placeholder}
          value={title}
          maxLength={120}
          onChange={setTitle}
        />
        <TextArea
          label={Co.new.bodyField.label}
          placeholder={Co.new.bodyField.placeholder}
          value={body}
          maxLength={2000}
          rows={6}
          onChange={setBody}
        />
        <Field
          label={Co.new.videoUrlField.label}
          placeholder={Co.new.videoUrlField.placeholder}
          value={videoUrl}
          maxLength={500}
          onChange={setVideoUrl}
        />
        <p className="px-1 text-[11px] text-stone-500 dark:text-stone-400">
          {Co.new.videoHint}
        </p>

        <Field
          label={Co.new.snsUrlField.label}
          placeholder={Co.new.snsUrlField.placeholder}
          value={snsUrl}
          maxLength={500}
          onChange={setSnsUrl}
        />

        <div className="block">
          <span className="text-[12px] font-semibold text-stone-700 dark:text-stone-300">
            {Co.new.imageField.label}
          </span>
          {imagePreview ? (
            <div className="mt-1 space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt=""
                className="max-h-64 w-full rounded-2xl object-cover"
              />
              <button
                type="button"
                onClick={removeImage}
                className="rounded-xl border border-stone-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-stone-700 transition active:scale-[0.97] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
              >
                {Co.new.imageRemove}
              </button>
            </div>
          ) : (
            <label
              className={`mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-5 text-[13px] font-semibold text-stone-600 transition active:scale-[0.99] dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 ${
                imageBusy ? 'pointer-events-none opacity-60' : ''
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              <span>{imageBusy ? Co.new.imageUploading : Co.new.imagePick}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={imageBusy}
                onChange={(e) => {
                  void handleImage(e.target.files?.[0] ?? null);
                  e.target.value = '';
                }}
              />
            </label>
          )}
          <p className="mt-1 px-1 text-[11px] text-stone-500 dark:text-stone-400">
            {Co.new.imageHint}
          </p>
        </div>

        <fieldset className="space-y-2 rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900">
          <legend className="px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            {PO.sectionTitle}
          </legend>
          <Toggle
            label={PO.allowLikes}
            checked={allowLikes}
            onChange={setAllowLikes}
          />
          <Toggle
            label={PO.allowComments}
            checked={allowComments}
            onChange={setAllowComments}
          />
        </fieldset>

        {errCode && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
            {Co.error[errCode as keyof typeof Co.error] ?? Co.error.generic}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || title.trim() === '' || body.trim() === ''}
          className="inline-flex w-full items-center justify-between rounded-2xl bg-stone-900 px-6 py-4 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-stone-900"
        >
          <span>{submitting ? Co.new.submitting : Co.new.submit}</span>
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </form>
    </AppShell>
  );
}

// 업로드 이미지 → JPEG 다운스케일·압축 → base64(데이터URL 접두 제거). 서버 한도(≤700KB base64)에 맞춤.
async function fileToImageB64(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('img'));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('img'));
    el.src = dataUrl;
  });
  const maxDim = 1280;
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('img');
  ctx.drawImage(img, 0, 0, width, height);
  const LIMIT = 700 * 1024;
  for (const quality of [0.82, 0.7, 0.55, 0.4, 0.3]) {
    const url = canvas.toDataURL('image/jpeg', quality);
    const b64 = url.slice(url.indexOf(',') + 1);
    if (b64.length <= LIMIT) return b64;
  }
  throw new Error('img');
}

function Field({
  label,
  placeholder,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-stone-700 dark:text-stone-300">
        {label}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
      />
    </label>
  );
}

function TextArea({
  label,
  placeholder,
  value,
  onChange,
  maxLength,
  rows,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  maxLength: number;
  rows: number;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-stone-700 dark:text-stone-300">
        {label}
      </span>
      <textarea
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 block w-full resize-none rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
      />
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

export default function NewCommunityPostPage() {
  return (
    <Suspense fallback={null}>
      <NewCommunityPostInner />
    </Suspense>
  );
}
