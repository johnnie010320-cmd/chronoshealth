'use client';

import { useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import {
  createFeatureRequest,
  deleteFeatureBodyFile,
  deleteFeatureBodyImage,
  deleteFeatureFile,
  deleteFeatureImage,
  deleteFeatureRequest,
  fetchMyFeatureRequests,
  updateFeatureRequest,
  uploadFeatureBodyFile,
  uploadFeatureBodyImage,
  uploadFeatureFile,
  uploadFeatureImage,
  type FeatureRequest,
  type FeatureRequestKind,
  type FeatureRequestStatus,
} from '@/lib/api-client';
import { FeatureAttachments } from '@/components/FeatureAttachments';
import { FeatureBody } from '@/components/FeatureBody';

type Draft = { kind: FeatureRequestKind; title: string; body: string; linkUrl: string };
type BodyMode = 'text' | 'image' | 'file';
const EMPTY: Draft = { kind: 'feature', title: '', body: '', linkUrl: '' };

export default function FeatureRequestsPage() {
  const { t } = useI18n();
  const F = t.featureRequests;
  const [signedIn, setSignedIn] = useState(false);
  const [items, setItems] = useState<FeatureRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<FeatureRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 본문 작성 방식 — 직접 작성(text) / 이미지 / PDF(택1).
  const [bodyMode, setBodyMode] = useState<BodyMode>('text');
  const [stagedBodyImage, setStagedBodyImage] = useState<File | null>(null);
  const [stagedBodyFile, setStagedBodyFile] = useState<File | null>(null);
  const [bodyImgPreview, setBodyImgPreview] = useState<string | null>(null);
  const bodyImageInput = useRef<HTMLInputElement>(null);
  const bodyFileInput = useRef<HTMLInputElement>(null);

  // 추가 첨부 — 본문과 별개로 이미지/PDF를 덧붙임.
  const [stagedImage, setStagedImage] = useState<File | null>(null);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [removeFile, setRemoveFile] = useState(false);
  const [imgPreview, setImgPreview] = useState<string | null>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!readSession()) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    void fetchMyFeatureRequests()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (!stagedBodyImage) {
      setBodyImgPreview(null);
      return;
    }
    const url = URL.createObjectURL(stagedBodyImage);
    setBodyImgPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [stagedBodyImage]);

  useEffect(() => {
    if (!stagedImage) {
      setImgPreview(null);
      return;
    }
    const url = URL.createObjectURL(stagedImage);
    setImgPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [stagedImage]);

  if (!signedIn) {
    return (
      <AppShell title={F.pageTitle} decoration="dots">
        <LoginRequired />
      </AppShell>
    );
  }

  const statusLabel = (s: FeatureRequestStatus): string =>
    s === 'planned'
      ? F.statusPlanned
      : s === 'in_progress'
        ? F.statusInProgress
        : s === 'done'
          ? F.statusDone
          : s === 'declined'
            ? F.statusDeclined
            : F.statusOpen;

  function clearStaged() {
    setStagedBodyImage(null);
    setStagedBodyFile(null);
    setStagedImage(null);
    setStagedFile(null);
    setRemoveImage(false);
    setRemoveFile(false);
    for (const r of [bodyImageInput, bodyFileInput, imageInput, fileInput]) {
      if (r.current) r.current.value = '';
    }
  }

  function resetForm() {
    setDraft(EMPTY);
    setEditingId(null);
    setEditingItem(null);
    setBodyMode('text');
    clearStaged();
    setErr(null);
  }

  function startEdit(item: FeatureRequest) {
    setEditingId(item.id);
    setEditingItem(item);
    setDraft({
      kind: item.kind,
      title: item.title,
      body: item.body,
      linkUrl: item.linkUrl ?? '',
    });
    setBodyMode(item.hasBodyImage ? 'image' : item.bodyFileName ? 'file' : 'text');
    clearStaged();
    setErr(null);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function changeBodyMode(m: BodyMode) {
    setBodyMode(m);
    // 방식 전환 시 준비해 둔 본문 파일 선택은 초기화.
    setStagedBodyImage(null);
    setStagedBodyFile(null);
    if (bodyImageInput.current) bodyImageInput.current.value = '';
    if (bodyFileInput.current) bodyFileInput.current.value = '';
  }

  const patchItem = (updated: FeatureRequest) =>
    setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));

  // 본문이 성립하는가 — 방식별로 텍스트/이미지/PDF 중 하나가 채워졌는지.
  const willHaveBodyImage =
    bodyMode === 'image' && (stagedBodyImage != null || Boolean(editingItem?.hasBodyImage));
  const willHaveBodyFile =
    bodyMode === 'file' && (stagedBodyFile != null || Boolean(editingItem?.bodyFileName));
  const bodyOk =
    bodyMode === 'text'
      ? draft.body.trim().length >= 1
      : bodyMode === 'image'
        ? willHaveBodyImage
        : willHaveBodyFile;
  const canSubmit = draft.title.trim().length >= 2 && bodyOk;

  async function handleSubmit() {
    const title = draft.title.trim();
    if (title.length < 2 || !bodyOk) {
      setErr(F.errInvalid);
      return;
    }
    const linkUrl = draft.linkUrl.trim() === '' ? null : draft.linkUrl.trim();
    // 본문 텍스트는 '직접 작성' 방식일 때만 저장. 이미지/PDF 방식이면 비운다.
    const bodyText = bodyMode === 'text' ? draft.body.trim() : '';
    setBusy(true);
    setErr(null);
    try {
      let item = editingId
        ? await updateFeatureRequest(editingId, {
            kind: draft.kind,
            title,
            body: bodyText,
            linkUrl,
          })
        : await createFeatureRequest({ kind: draft.kind, title, body: bodyText, linkUrl });
      const id = item.id;

      // 본문 미디어 반영.
      if (bodyMode === 'text') {
        if (editingItem?.hasBodyImage) item = await deleteFeatureBodyImage(id);
        if (editingItem?.bodyFileName) item = await deleteFeatureBodyFile(id);
      } else if (bodyMode === 'image') {
        if (stagedBodyImage) item = await uploadFeatureBodyImage(id, stagedBodyImage);
      } else if (bodyMode === 'file') {
        if (stagedBodyFile) item = await uploadFeatureBodyFile(id, stagedBodyFile);
      }

      // 추가 첨부 반영 — 제거 먼저, 그다음 신규 업로드(교체).
      if (removeImage && !stagedImage) item = await deleteFeatureImage(id);
      if (stagedImage) item = await uploadFeatureImage(id, stagedImage);
      if (removeFile && !stagedFile) item = await deleteFeatureFile(id);
      if (stagedFile) item = await uploadFeatureFile(id, stagedFile);

      if (editingId) patchItem(item);
      else setItems((prev) => [item, ...prev]);
      resetForm();
    } catch (e) {
      setErr(
        e instanceof Error && e.message === 'INVALID_INPUT' ? F.errInvalid : F.errGeneric,
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (typeof window !== 'undefined' && !window.confirm(F.deleteConfirm)) return;
    setBusy(true);
    try {
      await deleteFeatureRequest(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (editingId === id) resetForm();
    } catch {
      setErr(F.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    'w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100';
  const chipCls =
    'inline-flex items-center gap-1 rounded-lg border border-stone-200 px-2.5 py-1 text-[11px] font-semibold text-stone-600 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300';
  const keptBody =
    bodyMode === 'image'
      ? Boolean(editingItem?.hasBodyImage) && !stagedBodyImage
      : bodyMode === 'file'
        ? Boolean(editingItem?.bodyFileName) && !stagedBodyFile
        : false;

  const keptImage = Boolean(editingItem?.hasImage && !removeImage && !stagedImage);
  const keptFile = Boolean(editingItem?.fileName && !removeFile && !stagedFile);

  return (
    <AppShell title={F.pageTitle} decoration="dots">
      <p className="mt-3 px-1 text-[12px] leading-relaxed text-stone-500 dark:text-stone-400">
        {F.intro}
      </p>

      {/* 작성/수정 폼 */}
      <section className="card-shadow mt-3 rounded-2xl bg-white p-4 dark:bg-stone-900">
        <div className="flex gap-2">
          {(['feature', 'bug'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, kind: k }))}
              className={`flex-1 rounded-xl px-3 py-2 text-[12px] font-semibold transition ${
                draft.kind === k
                  ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                  : 'border border-stone-200 text-stone-600 dark:border-stone-700 dark:text-stone-300'
              }`}
            >
              {k === 'feature' ? F.kindFeature : F.kindBug}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          placeholder={F.titlePlaceholder}
          maxLength={120}
          className={`mt-2 ${inputCls}`}
        />

        {/* 본문 작성 방식 — 직접 작성 / 이미지 / PDF */}
        <div className="mt-3">
          <p className="mb-1 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
            {F.bodyModeLabel}
          </p>
          <div className="flex gap-2">
            {(
              [
                ['text', F.bodyModeText],
                ['image', F.bodyModeImage],
                ['file', F.bodyModeFile],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => changeBodyMode(m)}
                className={`flex-1 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition ${
                  bodyMode === m
                    ? 'bg-brand-700 text-white'
                    : 'border border-stone-200 text-stone-600 dark:border-stone-700 dark:text-stone-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {bodyMode === 'text' && (
            <textarea
              value={draft.body}
              onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
              placeholder={F.bodyPlaceholder}
              maxLength={4000}
              rows={4}
              className={`mt-2 resize-y ${inputCls}`}
            />
          )}

          {bodyMode === 'image' && (
            <div className="mt-2">
              <input
                ref={bodyImageInput}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => setStagedBodyImage(e.target.files?.[0] ?? null)}
              />
              {bodyImgPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={bodyImgPreview}
                  alt={F.bodyImageAlt}
                  className="mb-2 max-h-56 w-auto rounded-lg border border-stone-200 dark:border-stone-700"
                />
              )}
              {stagedBodyImage ? (
                <span className={chipCls}>
                  🖼 {stagedBodyImage.name.slice(0, 24)} · {F.selectedLabel}
                  <button
                    type="button"
                    onClick={() => setStagedBodyImage(null)}
                    className="ml-1 text-stone-400 hover:text-rose-600"
                  >
                    ✕
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => bodyImageInput.current?.click()}
                  className={chipCls}
                >
                  {keptBody ? F.bodyImageAlt + ' · ' + F.attachImageCta : F.attachImageCta}
                </button>
              )}
            </div>
          )}

          {bodyMode === 'file' && (
            <div className="mt-2">
              <input
                ref={bodyFileInput}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => setStagedBodyFile(e.target.files?.[0] ?? null)}
              />
              {stagedBodyFile ? (
                <span className={chipCls}>
                  📄 {stagedBodyFile.name.slice(0, 24)} · {F.selectedLabel}
                  <button
                    type="button"
                    onClick={() => setStagedBodyFile(null)}
                    className="ml-1 text-stone-400 hover:text-rose-600"
                  >
                    ✕
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => bodyFileInput.current?.click()}
                  className={chipCls}
                >
                  {keptBody ? (editingItem?.bodyFileName ?? F.attachFileCta) : F.attachFileCta}
                </button>
              )}
            </div>
          )}
          <p className="mt-1 text-[10px] text-stone-400 dark:text-stone-500">{F.attachHint}</p>
        </div>

        <input
          type="url"
          value={draft.linkUrl}
          onChange={(e) => setDraft((d) => ({ ...d, linkUrl: e.target.value }))}
          placeholder={F.linkPlaceholder}
          maxLength={500}
          className={`mt-3 ${inputCls}`}
        />

        {/* 추가 첨부 — 본문과 별개 */}
        <div className="mt-3 rounded-xl border border-dashed border-stone-200 p-3 dark:border-stone-700">
          <p className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
            {F.attachSectionLabel}
          </p>

          <input
            ref={imageInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setStagedImage(f);
              if (f) setRemoveImage(false);
            }}
          />
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setStagedFile(f);
              if (f) setRemoveFile(false);
            }}
          />

          {imgPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgPreview}
              alt={F.imageAlt}
              className="mt-2 max-h-40 w-auto rounded-lg border border-stone-200 dark:border-stone-700"
            />
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            {stagedImage ? (
              <span className={chipCls}>
                🖼 {stagedImage.name.slice(0, 24)} · {F.selectedLabel}
                <button
                  type="button"
                  onClick={() => setStagedImage(null)}
                  className="ml-1 text-stone-400 hover:text-rose-600"
                >
                  ✕
                </button>
              </span>
            ) : keptImage ? (
              <span className={chipCls}>
                🖼 {F.imageAlt}
                <button
                  type="button"
                  onClick={() => setRemoveImage(true)}
                  className="ml-1 text-stone-400 hover:text-rose-600"
                >
                  {F.removeImageCta}
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => imageInput.current?.click()}
                className={chipCls}
              >
                {F.attachImageCta}
              </button>
            )}

            {stagedFile ? (
              <span className={chipCls}>
                📄 {stagedFile.name.slice(0, 24)} · {F.selectedLabel}
                <button
                  type="button"
                  onClick={() => setStagedFile(null)}
                  className="ml-1 text-stone-400 hover:text-rose-600"
                >
                  ✕
                </button>
              </span>
            ) : keptFile ? (
              <span className={chipCls}>
                📄 {editingItem?.fileName}
                <button
                  type="button"
                  onClick={() => setRemoveFile(true)}
                  className="ml-1 text-stone-400 hover:text-rose-600"
                >
                  {F.removeFileCta}
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                className={chipCls}
              >
                {F.attachFileCta}
              </button>
            )}
          </div>
        </div>

        {err && (
          <p className="mt-2 text-[11px] text-rose-600 dark:text-rose-300">{err}</p>
        )}
        <div className="mt-3 flex gap-2">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              disabled={busy}
              className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 disabled:opacity-60 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
            >
              {F.cancelCta}
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy || !canSubmit}
            className="flex-1 rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {editingId ? F.saveCta : F.submitCta}
          </button>
        </div>
      </section>

      {/* 내 목록 */}
      {loaded && items.length === 0 ? (
        <p className="mt-6 px-1 text-center text-[12px] text-stone-500 dark:text-stone-400">
          {F.empty}
        </p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="card-shadow rounded-2xl bg-white p-4 dark:bg-stone-900"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    item.kind === 'bug'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200'
                      : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200'
                  }`}
                >
                  {item.kind === 'bug' ? F.kindBug : F.kindFeature}
                </span>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  {statusLabel(item.status)}
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-stone-900 dark:text-stone-100">
                {item.title}
              </p>

              {/* 본문 — 텍스트/이미지/PDF */}
              <FeatureBody
                item={item}
                scope="me"
                imageAlt={F.bodyImageAlt}
                download={F.downloadCta}
                textClassName="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-stone-600 dark:text-stone-300"
              />

              {/* 추가 첨부 */}
              <FeatureAttachments
                item={item}
                scope="me"
                labels={{
                  link: F.linkLabel,
                  imageAlt: F.imageAlt,
                  download: F.downloadCta,
                }}
              />

              {item.adminFeedback && (
                <div className="mt-2 rounded-xl bg-brand-50 px-3 py-2 dark:bg-brand-900/30">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-200">
                    {F.adminReply}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-[12px] leading-relaxed text-brand-900 dark:text-brand-100">
                    {item.adminFeedback}
                  </p>
                </div>
              )}

              <div className="mt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="text-[12px] font-semibold text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100"
                >
                  {F.editCta}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(item.id)}
                  className="text-[12px] font-semibold text-stone-400 hover:text-rose-600"
                >
                  {F.deleteCta}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
        {F.disclaimer}
      </div>
    </AppShell>
  );
}
