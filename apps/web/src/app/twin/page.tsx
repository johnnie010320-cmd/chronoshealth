'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import {
  addSurgery,
  checkNicknameAvailable,
  fetchConditions,
  fetchMeProfile,
  fetchSurgeries,
  removeSurgery,
  saveConditions,
  submitProfileUpdate,
  type MeProfile,
  type Surgery,
  type ConditionCategory,
} from '@/lib/api-client';
import { ChevronRightIcon } from '@/components/HealthIcons';

type CategoryState = Record<ConditionCategory, Set<string>>;
type CatalogState = Record<ConditionCategory, readonly string[]>;

// 백엔드(services/gateway/src/routes/medical/index.ts)와 동일 규약.
// '해당 없음' 센티넬은 단독 저장, 직접입력은 'custom:' 접두로 저장한다.
const NONE_CODE = 'none';
const CUSTOM_PREFIX = 'custom:';

export default function TwinPage() {
  const { t } = useI18n();
  const T = t.twin;
  const [signedIn, setSignedIn] = useState(false);
  const [me, setMe] = useState<MeProfile | null>(null);
  const [catalog, setCatalog] = useState<CatalogState | null>(null);
  const [picked, setPicked] = useState<CategoryState>({
    chronic: new Set(),
    critical: new Set(),
    family: new Set(),
  });
  const [surgeries, setSurgeries] = useState<Surgery[]>([]);

  // Nickname state
  const [nicknameInput, setNicknameInput] = useState('');
  const [nicknameAvail, setNicknameAvail] = useState<null | boolean>(null);
  const [nicknameBusy, setNicknameBusy] = useState(false);
  const [nicknameErr, setNicknameErr] = useState<string | null>(null);

  // Surgery form
  const [newSurgery, setNewSurgery] = useState({ name: '', year: '', note: '' });

  useEffect(() => {
    if (!readSession()) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    void Promise.all([
      fetchMeProfile(true).then((r) => r.profile),
      fetchConditions(),
      fetchSurgeries(),
    ]).then(([profile, cond, surg]) => {
      setMe(profile);
      setCatalog(cond.catalog);
      const next: CategoryState = {
        chronic: new Set(),
        critical: new Set(),
        family: new Set(),
      };
      for (const c of cond.conditions) {
        if (c.granted) next[c.category].add(c.code);
      }
      setPicked(next);
      setSurgeries(surg);
    });
  }, []);

  if (!signedIn) {
    return (
      <AppShell title={T.pageTitle} decoration="dots">
        <LoginRequired />
      </AppShell>
    );
  }

  function toggle(cat: ConditionCategory, code: string) {
    setPicked((prev) => {
      const next = { ...prev, [cat]: new Set(prev[cat]) };
      if (next[cat].has(code)) next[cat].delete(code);
      else {
        next[cat].add(code);
        next[cat].delete(NONE_CODE); // 실제 질환 선택 시 '해당 없음' 자동 해제
      }
      return next;
    });
  }

  // '해당 없음' 토글 — 선택 시 해당 카테고리의 다른 선택을 모두 비운다.
  function toggleNone(cat: ConditionCategory) {
    setPicked((prev) => {
      const has = prev[cat].has(NONE_CODE);
      return { ...prev, [cat]: new Set(has ? [] : [NONE_CODE]) };
    });
  }

  // 직접입력 추가 — 'custom:' 접두를 붙여 저장. '해당 없음'과 공존 불가.
  function addCustom(cat: ConditionCategory, raw: string) {
    const text = raw.trim();
    if (text === '') return;
    setPicked((prev) => {
      const next = { ...prev, [cat]: new Set(prev[cat]) };
      next[cat].delete(NONE_CODE);
      next[cat].add(`${CUSTOM_PREFIX}${text}`);
      return next;
    });
  }

  function removeCode(cat: ConditionCategory, code: string) {
    setPicked((prev) => {
      const next = { ...prev, [cat]: new Set(prev[cat]) };
      next[cat].delete(code);
      return next;
    });
  }

  async function persistCategory(cat: ConditionCategory) {
    await saveConditions(cat, Array.from(picked[cat]));
  }

  async function handleCheckNickname() {
    setNicknameErr(null);
    setNicknameAvail(null);
    setNicknameBusy(true);
    try {
      const ok = await checkNicknameAvailable(nicknameInput.trim());
      setNicknameAvail(ok);
    } catch (e) {
      setNicknameErr(e instanceof Error ? e.message : 'generic');
    } finally {
      setNicknameBusy(false);
    }
  }

  async function handleSaveNickname() {
    if (!me) return;
    const nick = nicknameInput.trim();
    if (
      typeof window !== 'undefined' &&
      !window.confirm(T.nicknameConfirmLock.replace('{name}', nick))
    ) {
      return;
    }
    setNicknameBusy(true);
    setNicknameErr(null);
    try {
      const updated = await submitProfileUpdate({
        name: me.name ?? '',
        phone: me.phone ?? '',
        birthYear: me.birthYear ?? new Date().getFullYear() - 20,
        sex: me.sex ?? 'other',
        nationality: (me.nationality as 'KR' | 'US' | 'JP' | 'ES' | 'OTHER') ?? 'OTHER',
        nickname: nick,
      });
      setMe(updated.profile);
      setNicknameAvail(null);
      setNicknameInput('');
    } catch (e) {
      setNicknameErr(e instanceof Error ? e.message : 'generic');
    } finally {
      setNicknameBusy(false);
    }
  }

  async function handleAddSurgery() {
    if (newSurgery.name.trim() === '') return;
    const year = newSurgery.year.trim() === '' ? null : Number(newSurgery.year);
    const id = await addSurgery({
      surgeryName: newSurgery.name.trim(),
      surgeryYear: year && Number.isFinite(year) ? year : null,
      note: newSurgery.note.trim() === '' ? null : newSurgery.note.trim(),
    });
    setSurgeries((prev) => [
      {
        id,
        surgeryName: newSurgery.name.trim(),
        surgeryYear: year && Number.isFinite(year) ? year : null,
        note: newSurgery.note.trim() === '' ? null : newSurgery.note.trim(),
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setNewSurgery({ name: '', year: '', note: '' });
  }

  async function handleRemoveSurgery(id: string) {
    await removeSurgery(id);
    setSurgeries((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <AppShell title={T.pageTitle} decoration="dots">
      {/* 닉네임 섹션 */}
      <section className="card-shadow mt-4 rounded-2xl bg-white p-4 dark:bg-stone-900">
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
          {T.nicknameTitle}
        </h2>
        <p className="mt-1 text-[11px] text-stone-500 dark:text-stone-400">
          {T.nicknameHint}
        </p>
        {me?.nickname ? (
          <div className="mt-2 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">
            {me.nickname} · {T.nicknameLocked}
          </div>
        ) : (
          <div className="mt-2 space-y-2">
            <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] font-semibold leading-relaxed text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              {T.nicknameLockWarning}
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={nicknameInput}
                onChange={(e) => {
                  setNicknameInput(e.target.value);
                  setNicknameAvail(null);
                }}
                placeholder={T.nicknamePlaceholder}
                maxLength={8}
                className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
              />
              <button
                type="button"
                onClick={() => void handleCheckNickname()}
                disabled={nicknameBusy || nicknameInput.trim().length < 2}
                className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-[12px] font-semibold dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
              >
                {T.checkCta}
              </button>
            </div>
            {nicknameAvail === true && (
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                {T.available}
              </p>
            )}
            {nicknameAvail === false && (
              <p className="text-[11px] text-rose-700 dark:text-rose-300">{T.taken}</p>
            )}
            {nicknameErr && (
              <p className="text-[11px] text-rose-600 dark:text-rose-300">
                {T.errCodes[nicknameErr as keyof typeof T.errCodes] ?? T.errCodes.generic}
              </p>
            )}
            <button
              type="button"
              onClick={() => void handleSaveNickname()}
              disabled={nicknameBusy || nicknameAvail !== true}
              className="w-full rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-stone-900"
            >
              {T.saveCta}
            </button>
          </div>
        )}
      </section>

      {/* 만성질환 */}
      {catalog && (
        <ConditionCategorySection
          title={T.chronicTitle}
          codes={catalog.chronic}
          picked={picked.chronic}
          onToggle={(code) => toggle('chronic', code)}
          onToggleNone={() => toggleNone('chronic')}
          onAddCustom={(text) => addCustom('chronic', text)}
          onRemoveCode={(code) => removeCode('chronic', code)}
          onSave={() => void persistCategory('chronic')}
          labels={T.chronicCodes}
          text={{
            none: T.noneLabel,
            customPlaceholder: T.customPlaceholder,
            customAdd: T.customAddCta,
            save: T.saveCta,
          }}
        />
      )}

      {/* 중증질환 */}
      {catalog && (
        <ConditionCategorySection
          title={T.criticalTitle}
          codes={catalog.critical}
          picked={picked.critical}
          onToggle={(code) => toggle('critical', code)}
          onToggleNone={() => toggleNone('critical')}
          onAddCustom={(text) => addCustom('critical', text)}
          onRemoveCode={(code) => removeCode('critical', code)}
          onSave={() => void persistCategory('critical')}
          labels={T.criticalCodes}
          text={{
            none: T.noneLabel,
            customPlaceholder: T.customPlaceholder,
            customAdd: T.customAddCta,
            save: T.saveCta,
          }}
        />
      )}

      {/* 가족력 */}
      {catalog && (
        <ConditionCategorySection
          title={T.familyTitle}
          codes={catalog.family}
          picked={picked.family}
          onToggle={(code) => toggle('family', code)}
          onToggleNone={() => toggleNone('family')}
          onAddCustom={(text) => addCustom('family', text)}
          onRemoveCode={(code) => removeCode('family', code)}
          onSave={() => void persistCategory('family')}
          labels={T.familyCodes}
          text={{
            none: T.noneLabel,
            customPlaceholder: T.customPlaceholder,
            customAdd: T.customAddCta,
            save: T.saveCta,
          }}
        />
      )}

      {/* 수술 기록 */}
      <section className="card-shadow mt-4 rounded-2xl bg-white p-4 dark:bg-stone-900">
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
          {T.surgeryTitle}
        </h2>
        {/* 수술명·연도·메모를 모두 입력한 뒤 아래 '저장'으로 한 번에 등록한다. */}
        <div className="mt-2 grid grid-cols-[1fr_5rem] gap-2">
          <input
            type="text"
            value={newSurgery.name}
            onChange={(e) => setNewSurgery((s) => ({ ...s, name: e.target.value }))}
            placeholder={T.surgeryNamePh}
            maxLength={80}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
          />
          <input
            type="text"
            inputMode="numeric"
            value={newSurgery.year}
            onChange={(e) => setNewSurgery((s) => ({ ...s, year: e.target.value }))}
            placeholder={T.surgeryYearPh}
            maxLength={4}
            className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
          />
        </div>
        <input
          type="text"
          value={newSurgery.note}
          onChange={(e) => setNewSurgery((s) => ({ ...s, note: e.target.value }))}
          placeholder={T.surgeryNotePh}
          maxLength={500}
          className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
        />
        <button
          type="button"
          onClick={() => void handleAddSurgery()}
          disabled={newSurgery.name.trim() === ''}
          className="mt-2 w-full rounded-xl bg-brand-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {T.surgerySaveCta}
        </button>
        {surgeries.length === 0 ? (
          <p className="mt-3 text-[11px] text-stone-500 dark:text-stone-400">
            {T.surgeryEmpty}
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {surgeries.map((s) => (
              <li
                key={s.id}
                className="flex items-start gap-2 rounded-xl bg-stone-50 px-3 py-2 dark:bg-stone-800"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {s.surgeryName}
                    {s.surgeryYear != null && (
                      <span className="ml-2 text-[11px] font-normal text-stone-500">
                        ({s.surgeryYear})
                      </span>
                    )}
                  </p>
                  {s.note && (
                    <p className="mt-0.5 text-[11px] text-stone-600 dark:text-stone-400">
                      {s.note}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleRemoveSurgery(s.id)}
                  className="text-stone-400 hover:text-rose-600"
                  aria-label={T.removeCta}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
        {T.disclaimer}
      </div>
    </AppShell>
  );
}

function ConditionCategorySection({
  title,
  codes,
  picked,
  onToggle,
  onToggleNone,
  onAddCustom,
  onRemoveCode,
  onSave,
  labels,
  text,
}: {
  title: string;
  codes: readonly string[];
  picked: Set<string>;
  onToggle: (code: string) => void;
  onToggleNone: () => void;
  onAddCustom: (text: string) => void;
  onRemoveCode: (code: string) => void;
  onSave: () => void;
  labels: Record<string, string>;
  text: { none: string; customPlaceholder: string; customAdd: string; save: string };
}) {
  const [customInput, setCustomInput] = useState('');
  const noneSelected = picked.has(NONE_CODE);
  // 사용자가 직접 입력한 항목(카탈로그에 없는 custom: 코드)만 칩으로 별도 표시.
  const customCodes = Array.from(picked).filter((c) => c.startsWith(CUSTOM_PREFIX));

  function commitCustom() {
    onAddCustom(customInput);
    setCustomInput('');
  }

  return (
    <section className="card-shadow mt-4 rounded-2xl bg-white p-4 dark:bg-stone-900">
      <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">{title}</h2>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {codes.map((code) => (
          <label
            key={code}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] dark:border-stone-800 dark:bg-stone-900"
          >
            <input
              type="checkbox"
              checked={picked.has(code)}
              onChange={() => onToggle(code)}
              className="h-4 w-4 accent-brand-600"
            />
            <span className="text-stone-800 dark:text-stone-200">
              {labels[code] ?? code}
            </span>
          </label>
        ))}
      </div>

      {/* 해당 없음 — 선택 시 다른 항목을 모두 해제 */}
      <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-[12px] dark:border-stone-800 dark:bg-stone-800/60">
        <input
          type="checkbox"
          checked={noneSelected}
          onChange={onToggleNone}
          className="h-4 w-4 accent-brand-600"
        />
        <span className="font-semibold text-stone-700 dark:text-stone-200">
          {text.none}
        </span>
      </label>

      {/* 직접 입력한 항목 칩 */}
      {customCodes.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {customCodes.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-200"
            >
              {code.slice(CUSTOM_PREFIX.length)}
              <button
                type="button"
                onClick={() => onRemoveCode(code)}
                className="text-brand-400 hover:text-rose-600"
                aria-label={code.slice(CUSTOM_PREFIX.length)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* 직접 입력 */}
      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitCustom();
            }
          }}
          placeholder={text.customPlaceholder}
          maxLength={50}
          disabled={noneSelected}
          className="flex-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[12px] disabled:opacity-50 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
        />
        <button
          type="button"
          onClick={commitCustom}
          disabled={noneSelected || customInput.trim() === ''}
          className="shrink-0 rounded-xl border border-stone-300 bg-white px-3 py-2 text-[12px] font-semibold disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
        >
          {text.customAdd}
        </button>
      </div>

      <button
        type="button"
        onClick={onSave}
        className="mt-3 inline-flex w-full items-center justify-between rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-stone-900"
      >
        <span>{text.save}</span>
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </section>
  );
}
