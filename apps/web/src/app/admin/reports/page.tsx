'use client';

// 관리자 · 신고 처리 (2026-11-08 — Google Play 사용자 제작 콘텐츠 정책: 신고는 제때 확인해 처리).
// 회원이 신고한 글·댓글·메시지를 보고 '내리기'(내용 삭제) 또는 '문제없음'. 같은 대상의 다른 신고도 함께 닫힌다.
// gateway: GET /api/v1/admin/reports?status= · POST /api/v1/admin/reports/:id { action }

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import { fetchAdminReports, resolveAdminReport, type AdminReport } from '@/lib/api-client';

type Filter = 'open' | 'removed' | 'dismissed' | 'all';
const FILTERS: Array<[Filter, string]> = [
  ['open', '처리 대기'],
  ['removed', '내림'],
  ['dismissed', '문제없음'],
  ['all', '전체'],
];
const TARGET_LABEL: Record<AdminReport['targetType'], string> = { post: '글', comment: '댓글', message: '메시지' };
const REASON_LABEL: Record<AdminReport['reason'], string> = {
  spam: '스팸·광고',
  abuse: '욕설·괴롭힘·혐오',
  sexual: '음란·성적인 내용',
  violence: '폭력·위협',
  self_harm: '자해·자살 관련',
  misinfo: '잘못된 건강 정보',
  other: '기타',
};
const STATUS_LABEL: Record<AdminReport['status'], string> = { open: '처리 대기', removed: '내림', dismissed: '문제없음' };

export default function AdminReportsPage() {
  const [state, setState] = useState<'loading' | 'ok' | 'forbidden' | 'error'>('loading');
  const [filter, setFilter] = useState<Filter>('open');
  const [rows, setRows] = useState<AdminReport[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (f: Filter) => {
    try {
      const r = await fetchAdminReports(f);
      setRows(r.reports);
      setOpenCount(r.openCount);
      setState('ok');
    } catch (e) {
      const code = e instanceof Error ? e.message : '';
      setState(code === 'FORBIDDEN' || code === 'UNAUTHORIZED' ? 'forbidden' : 'error');
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  async function act(r: AdminReport, action: 'remove' | 'dismiss') {
    const q = action === 'remove' ? `이 ${TARGET_LABEL[r.targetType]}을(를) 내릴까요? 되돌릴 수 없습니다.` : '문제없음으로 닫을까요?';
    if (busy || !window.confirm(q)) return;
    setBusy(r.id);
    try {
      await resolveAdminReport(r.id, action);
      await load(filter);
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell title="신고 처리">
      {state === 'loading' ? (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      ) : state === 'forbidden' ? (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-6 text-center text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          관리자만 접근할 수 있습니다.
        </div>
      ) : (
        <div className="space-y-3 pb-10 pt-3">
          <p className="rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-2.5 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
            회원이 신고한 글·댓글·메시지입니다. 앱에 &lsquo;24시간 안에 확인&rsquo;이라고 안내하고 있으니 처리 대기 {openCount}건을 그 안에 봐 주세요.
            <b> 내리기</b> = 내용 삭제, <b>문제없음</b> = 그대로 둠. 같은 대상의 다른 신고도 함께 닫힙니다.
          </p>

          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map(([f, label]) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                  filter === f ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900' : 'bg-white text-stone-600 dark:bg-stone-900 dark:text-stone-300'
                }`}
              >
                {label}
                {f === 'open' && openCount > 0 ? ` ${openCount}` : ''}
              </button>
            ))}
          </div>

          {state === 'error' && <p className="text-[12px] text-rose-600">불러오지 못했습니다.</p>}
          {rows.length === 0 && state === 'ok' && (
            <p className="rounded-2xl bg-white px-4 py-6 text-center text-[13px] text-stone-500 dark:bg-stone-900 dark:text-stone-400">신고가 없습니다.</p>
          )}

          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="card-shadow rounded-2xl bg-white px-4 py-3 dark:bg-stone-900">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-200">
                    {TARGET_LABEL[r.targetType]}
                  </span>
                  <span className="rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-200">
                    {REASON_LABEL[r.reason]}
                  </span>
                  <span className="text-stone-500 dark:text-stone-400">{STATUS_LABEL[r.status]}</span>
                  <span className="ml-auto text-stone-400">{r.createdAt.slice(0, 16).replace('T', ' ')}</span>
                </div>
                <p className="mt-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                  작성자 <b className="text-stone-700 dark:text-stone-200">{r.targetOwnerNickname ?? r.targetOwnerPseudonymId.slice(0, 8)}</b>
                  {' · '}신고자 {r.reporterNickname ?? r.reporterPseudonymId.slice(0, 8)}
                </p>
                <p className="mt-1.5 whitespace-pre-wrap break-words rounded-xl bg-stone-50 px-3 py-2 text-[13px] text-stone-800 dark:bg-stone-950 dark:text-stone-200">
                  {r.preview ?? '(이미 지워진 내용)'}
                </p>
                {r.detail && <p className="mt-1.5 text-[12px] text-stone-600 dark:text-stone-300">신고 내용: {r.detail}</p>}
                {r.status === 'open' && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void act(r, 'remove')}
                      className="rounded-xl bg-rose-600 px-4 py-2 text-[12px] font-semibold text-white disabled:opacity-50"
                    >
                      내리기
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => void act(r, 'dismiss')}
                      className="rounded-xl border border-stone-300 px-4 py-2 text-[12px] font-semibold text-stone-700 disabled:opacity-50 dark:border-stone-700 dark:text-stone-200"
                    >
                      문제없음
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </AdminShell>
  );
}
