'use client';

import { useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { useI18n } from '@/lib/i18n';
import {
  adminCreateCategory,
  adminCreateFeaturedVideo,
  adminDeleteCategory,
  adminDeleteFeaturedVideo,
  fetchCommunityCategories,
  fetchFeaturedVideos,
  COMMUNITY_GROUP_KEYS,
  type CommunityCategory,
  type CommunityFeaturedVideo,
  type CommunityGroupKey,
} from '@/lib/api-client';

export default function AdminCommunityHubPage() {
  const { t } = useI18n();
  const A = t.admin;
  const H = A.commHub;
  const GROUPS = t.community.groupTabs;

  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [videos, setVideos] = useState<CommunityFeaturedVideo[]>([]);
  const [group, setGroup] = useState<CommunityGroupKey>('overcome');
  const [catName, setCatName] = useState('');
  const [vidTitle, setVidTitle] = useState('');
  const [vidUrl, setVidUrl] = useState('');
  const [vidScope, setVidScope] = useState<string>('group'); // 'group' or category id
  const [busy, setBusy] = useState(false);
  const [errCode, setErrCode] = useState<string | null>(null);

  function reload() {
    Promise.all([fetchCommunityCategories(), fetchFeaturedVideos()])
      .then(([cats, vids]) => {
        setCategories(cats);
        setVideos(vids);
      })
      .catch((e) => setErrCode(e instanceof Error ? e.message : 'generic'));
  }
  useEffect(reload, []);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setErrCode(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setErrCode(e instanceof Error ? e.message : 'generic');
    } finally {
      setBusy(false);
    }
  }

  const groupCats = categories.filter((c) => c.groupKey === group);

  async function addCategory() {
    if (catName.trim() === '') return;
    await run(async () => {
      await adminCreateCategory({
        groupKey: group,
        name: catName.trim(),
        sortOrder: groupCats.length + 1,
      });
      setCatName('');
    });
  }

  async function addVideo() {
    if (vidTitle.trim() === '' || vidUrl.trim() === '') return;
    const isCat = vidScope !== 'group';
    await run(async () => {
      await adminCreateFeaturedVideo({
        title: vidTitle.trim(),
        videoUrl: vidUrl.trim(),
        groupKey: isCat ? null : group,
        categoryId: isCat ? vidScope : null,
        sortOrder: videos.length + 1,
      });
      setVidTitle('');
      setVidUrl('');
    });
  }

  const catName_ = (id: string | null) =>
    id ? (categories.find((c) => c.id === id)?.name ?? id) : null;

  return (
    <AdminShell title={H.title}>
      {errCode && (
        <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          {A.error[errCode as keyof typeof A.error] ?? A.error.generic}
        </div>
      )}

      {/* 그룹 선택 */}
      <div className="mt-4 flex gap-1.5">
        {COMMUNITY_GROUP_KEYS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroup(g)}
            className={`flex-1 rounded-xl px-2 py-2 text-[12px] font-semibold transition ${
              group === g
                ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900'
                : 'bg-white text-stone-600 dark:bg-stone-900 dark:text-stone-300'
            }`}
          >
            {GROUPS[g]}
          </button>
        ))}
      </div>

      {/* 카테고리 관리 */}
      <section className="card-shadow mt-4 rounded-2xl bg-white p-4 dark:bg-stone-900">
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">{H.catTitle}</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {groupCats.length === 0 && <span className="text-[11px] text-stone-400">{H.catEmpty}</span>}
          {groupCats.map((cat) => (
            <span
              key={cat.id}
              className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-3 py-1 text-[12px] text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
            >
              {cat.name}
              <button
                type="button"
                onClick={() =>
                  typeof window !== 'undefined' &&
                  window.confirm(H.confirmCatDelete) &&
                  void run(() => adminDeleteCategory(cat.id))
                }
                aria-label={H.deleteCta}
                className="text-stone-400 hover:text-rose-600"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder={H.catNamePh}
            maxLength={40}
            className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
          />
          <button
            type="button"
            onClick={() => void addCategory()}
            disabled={busy || catName.trim() === ''}
            className="rounded-xl bg-stone-900 px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-stone-900"
          >
            {H.catAdd}
          </button>
        </div>
      </section>

      {/* 동영상 관리 */}
      <section className="card-shadow mt-4 rounded-2xl bg-white p-4 dark:bg-stone-900">
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">{H.vidTitle}</h2>
        <div className="mt-2 space-y-2">
          <input
            type="text"
            value={vidTitle}
            onChange={(e) => setVidTitle(e.target.value)}
            placeholder={H.vidTitlePh}
            maxLength={120}
            className="block w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
          />
          <input
            type="url"
            value={vidUrl}
            onChange={(e) => setVidUrl(e.target.value)}
            placeholder={H.vidUrlPh}
            maxLength={500}
            className="block w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
          />
          <div className="flex gap-2">
            <select
              value={vidScope}
              onChange={(e) => setVidScope(e.target.value)}
              className="flex-1 rounded-xl border border-stone-200 bg-white px-2 py-2 text-[13px] dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
            >
              <option value="group">
                {GROUPS[group]} · {H.scopeGroupAll}
              </option>
              {groupCats.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void addVideo()}
              disabled={busy || vidTitle.trim() === '' || vidUrl.trim() === ''}
              className="rounded-xl bg-stone-900 px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-stone-900"
            >
              {H.vidAdd}
            </button>
          </div>
        </div>

        <ul className="mt-3 space-y-2">
          {videos.length === 0 && <li className="text-[11px] text-stone-400">{H.vidEmpty}</li>}
          {videos.map((v) => (
            <li
              key={v.id}
              className="flex items-start justify-between gap-2 rounded-xl bg-stone-50 px-3 py-2 dark:bg-stone-800"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-stone-900 dark:text-stone-100">
                  {v.title}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-stone-500 dark:text-stone-400">
                  <span className="rounded-full bg-brand-50 px-1.5 py-0.5 font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
                    {v.categoryId
                      ? catName_(v.categoryId)
                      : v.groupKey
                        ? `${GROUPS[v.groupKey]} · ${H.scopeGroupAll}`
                        : '—'}
                  </span>
                  <a
                    href={v.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate underline"
                  >
                    {v.videoUrl}
                  </a>
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  typeof window !== 'undefined' &&
                  window.confirm(H.confirmVidDelete) &&
                  void run(() => adminDeleteFeaturedVideo(v.id))
                }
                className="shrink-0 rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-semibold text-rose-700 dark:border-rose-900 dark:bg-stone-900 dark:text-rose-300"
              >
                {H.deleteCta}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </AdminShell>
  );
}
