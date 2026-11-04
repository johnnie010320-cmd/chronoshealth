'use client';

// 생체나이 리포트 — 홈 "Digital Twin 생체나이 리포트 > 상세보기" 도착지(첨부 PDF 8페이지 구성).
// 4대 나이(생체/혈관/피부/골격)를 스피도미터 게이지 + 해설 + 추천 + 상세 버튼으로.
// 의료·윤리: 나이 값은 측정/추정값(fetchAvatarMe)이며 날조 없음. 게이지·도식은 원본 SVG.

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { AgeGauge } from '@/components/charts/AgeGauge';
import { ChevronRightIcon, ClipboardIcon } from '@/components/HealthIcons';
import { readSession } from '@/lib/session';
import { fetchAvatarMe, type AvatarResponse } from '@/lib/api-client';

type AgeKey = 'life' | 'vascular' | 'skin' | 'joint';

type AgeCfg = {
  key: AgeKey;
  ko: string;
  en: string;
  card: string;
  bar: string;
  left: string;
  right: string;
  rec: string;
  detailHref: string;
  detailCta: string;
  art?: ReactNode;
};

function explain(ko: string, delta: number): string {
  if (delta > 0)
    return `${ko}가 실제 나이보다 ${delta}세 젊게 측정되었습니다. 관련 신체 시스템이 효율적으로 작동하고 있음을 의미합니다.`;
  if (delta < 0)
    return `${ko}가 실제 나이보다 ${-delta}세 높게 측정되었습니다. 생활 습관 개선으로 노화 속도를 늦출 여지가 있습니다.`;
  return `${ko}가 실제 나이와 비슷한 수준입니다. 현재 상태를 꾸준히 유지하세요.`;
}

// 원본 SVG 도식(스톡 이미지 미사용)
const VesselArt = (
  <svg viewBox="0 0 64 40" className="h-10 w-16" aria-hidden>
    <rect x="2" y="8" width="60" height="24" rx="12" className="fill-rose-100 dark:fill-rose-900/40" />
    <rect x="2" y="15" width="60" height="10" rx="5" className="fill-rose-400/70" />
    <circle cx="20" cy="20" r="3" className="fill-rose-600" />
    <circle cx="30" cy="20" r="3" className="fill-rose-600" />
    <path d="M42 20h14" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
const SkinArt = (
  <svg viewBox="0 0 64 40" className="h-10 w-16" aria-hidden>
    <rect x="4" y="6" width="56" height="8" rx="2" className="fill-amber-300" />
    <rect x="4" y="15" width="56" height="10" rx="2" className="fill-amber-400/80" />
    <rect x="4" y="26" width="56" height="9" rx="2" className="fill-amber-500/70" />
    <line x1="14" y1="6" x2="14" y2="35" stroke="#b45309" strokeWidth="0.8" />
    <line x1="32" y1="6" x2="32" y2="35" stroke="#b45309" strokeWidth="0.8" />
    <line x1="50" y1="6" x2="50" y2="35" stroke="#b45309" strokeWidth="0.8" />
  </svg>
);
const JointArt = (
  <svg viewBox="0 0 64 40" className="h-10 w-16" aria-hidden>
    <rect x="26" y="2" width="12" height="16" rx="6" className="fill-sky-200 dark:fill-sky-900/50" />
    <rect x="26" y="22" width="12" height="16" rx="6" className="fill-sky-200 dark:fill-sky-900/50" />
    <ellipse cx="32" cy="20" rx="12" ry="4" className="fill-sky-400/70" />
  </svg>
);

const AGES: AgeCfg[] = [
  {
    key: 'life', ko: '생체 나이', en: 'Biological Age', card: 'card-emerald', bar: 'bg-emerald-500',
    left: '건강', right: '노화',
    rec: '균형 잡힌 식단과 꾸준한 근력·유산소 운동 루틴을 유지하세요. 정기적인 스트레스 관리도 도움이 됩니다.',
    detailHref: '/ai-diagnosis', detailCta: '상세 데이터 보기',
  },
  {
    key: 'vascular', ko: '혈관 나이', en: 'Vascular Age', card: 'card-rose', bar: 'bg-rose-500',
    left: '혈관 벽 탄력성', right: '혈류 속도',
    rec: '지방·나트륨 섭취를 줄이고 항산화 식품을 늘리세요. 주 4회 이상 중간 강도 유산소 운동(달리기·자전거)과 금연을 권장합니다.',
    detailHref: '/simulate', detailCta: '상세 관리 계획', art: VesselArt,
  },
  {
    key: 'skin', ko: '피부 나이', en: 'Dermal Age', card: 'card-amber', bar: 'bg-amber-500',
    left: '수분', right: '탄력',
    rec: '충분한 수분 섭취와 자외선 차단, 항산화 식단으로 피부 수분·탄력을 유지하세요.',
    detailHref: '/simulate', detailCta: '상세 피부 데이터 보기', art: SkinArt,
  },
  {
    key: 'joint', ko: '골격 나이', en: 'Bone & Joint Age', card: 'card-sky', bar: 'bg-sky-500',
    left: '골밀도', right: '관절 유연성',
    rec: '스쿼트·데드리프트 등 체중 부하 운동과 필라테스·요가를 병행하고, 칼슘·비타민 D·K가 풍부한 식품과 충분한 일광욕을 권장합니다.',
    detailHref: '/simulate', detailCta: '상세 골격 관리 계획', art: JointArt,
  },
];

export default function BioAgePage() {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'unauth' }
    | { status: 'noReport' }
    | { status: 'ok'; data: AvatarResponse }
    | { status: 'err' }
  >({ status: 'loading' });

  useEffect(() => {
    if (!readSession()) {
      setState({ status: 'unauth' });
      return;
    }
    fetchAvatarMe()
      .then((data) => setState({ status: 'ok', data }))
      .catch((e) => {
        const code = e instanceof Error ? e.message : 'generic';
        if (code === 'NO_REPORT') setState({ status: 'noReport' });
        else if (code === 'UNAUTHORIZED') setState({ status: 'unauth' });
        else setState({ status: 'err' });
      });
  }, []);

  return (
    <AppShell title="생체나이 리포트" decoration="dots">
      {state.status === 'loading' && (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}
      {state.status === 'unauth' && <LoginRequired />}
      {state.status === 'err' && (
        <div className="mt-6 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100">
          리포트를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </div>
      )}
      {state.status === 'noReport' && (
        <section className="card-shadow mt-4 rounded-3xl card-sky px-5 py-8 text-center">
          <h2 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
            아직 생체나이 리포트가 없습니다
          </h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-stone-600 dark:text-stone-300">
            설문을 완료하면 나의 4대 생체 나이를 확인할 수 있습니다.
          </p>
          <Link
            href="/survey"
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-5 py-2.5 text-[13px] font-bold text-white transition active:scale-[0.98]"
          >
            <ClipboardIcon className="h-4 w-4" />
            설문 시작하기
          </Link>
        </section>
      )}

      {state.status === 'ok' && (() => {
        const d = state.data;
        const chrono = d.chronologicalAge;
        return (
          <div className="space-y-4 pb-10 pt-2">
            <section>
              <h1 className="text-3xl font-black tracking-tight text-stone-900 dark:text-stone-100">
                생체나이 리포트
              </h1>
              <p className="mt-1 text-[12.5px] font-bold text-emerald-700 dark:text-emerald-300">
                {d.name ? `${d.name} · ` : ''}실제 나이 {chrono}세 기준 4대 생체 나이
              </p>
            </section>

            {AGES.map((a) => {
              const val = d.fiveAges[a.key];
              const delta = chrono - val; // >0 = 더 젊음
              const younger = delta > 0;
              return (
                <section key={a.key} className={`card-shadow rounded-3xl ${a.card} px-5 py-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-[15px] font-extrabold text-stone-900 dark:text-stone-100">
                        <span className={`accent-bar ${a.bar}`} />
                        {a.ko}
                      </h2>
                      <p className="text-[10px] font-semibold text-stone-500 dark:text-stone-400">
                        ({a.en})
                      </p>
                      <p className="mt-2 text-4xl font-black tabular-nums text-stone-900 dark:text-stone-100">
                        {val}세
                      </p>
                      <p className={`mt-0.5 text-[13px] font-extrabold ${younger ? 'text-emerald-600 dark:text-emerald-400' : delta < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-stone-500'}`}>
                        {delta === 0 ? '±0세' : younger ? `↓ -${delta}세` : `↑ +${-delta}세`}
                      </p>
                    </div>
                    <div className="w-[48%] shrink-0 text-stone-700 dark:text-stone-200">
                      <AgeGauge delta={delta} leftLabel={a.left} rightLabel={a.right} />
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl bg-white/70 px-4 py-3 dark:bg-stone-900/50">
                    <p className="text-[12px] leading-relaxed text-stone-700 dark:text-stone-200">
                      <b className="font-bold">자세한 해설</b> · {explain(a.ko, delta)}
                    </p>
                    <p className="mt-2 flex gap-2 text-[12px] leading-relaxed text-stone-600 dark:text-stone-300">
                      {a.art && <span className="shrink-0">{a.art}</span>}
                      <span>
                        <b className="font-bold">추천</b> · {a.rec}
                      </span>
                    </p>
                  </div>

                  <Link
                    href={a.detailHref}
                    className="mt-3 flex items-center justify-between gap-2 rounded-2xl bg-white px-4 py-2.5 transition active:scale-[0.99] dark:bg-stone-900"
                  >
                    <span className="text-[12.5px] font-bold text-stone-800 dark:text-stone-100">
                      {a.detailCta}
                    </span>
                    <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
                  </Link>
                </section>
              );
            })}

            <p className="px-1 text-[10px] leading-relaxed text-stone-400 dark:text-stone-500">
              생체 나이는 설문·검진 데이터 기반 추정값입니다. 데이터가 쌓일수록 더 정밀해집니다.
            </p>
          </div>
        );
      })()}
    </AppShell>
  );
}
