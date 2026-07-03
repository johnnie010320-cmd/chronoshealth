'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LoginRequired } from '@/components/LoginRequired';
import { ChevronRightIcon, UsersIcon } from '@/components/HealthIcons';
import { useI18n } from '@/lib/i18n';
import { readSession } from '@/lib/session';
import {
  fetchCommunities,
  fetchCommunityCategories,
  fetchFeaturedVideos,
  fetchHotPeople,
  searchCommunity,
  COMMUNITY_GROUP_KEYS,
  type CommunitySummary,
  type CommunityCategory,
  type CommunityFeaturedVideo,
  type CommunityGroupKey,
  type CommunitySearchResult,
  type HotPerson,
} from '@/lib/api-client';

// YouTube/Vimeo URL → 영상 ID (썸네일·임베드용). 실패 시 null.
function youtubeId(url: string): string | null {
  const m =
    url.match(/[?&]v=([\w-]{6,})/) ||
    url.match(/youtu\.be\/([\w-]{6,})/) ||
    url.match(/\/embed\/([\w-]{6,})/) ||
    url.match(/\/shorts\/([\w-]{6,})/);
  return m ? (m[1] ?? null) : null;
}

export default function CommunityPage() {
  const { t } = useI18n();
  const Co = t.community;
  const G = Co.groups;
  const [signedIn, setSignedIn] = useState(false);
  const [mine, setMine] = useState<CommunitySummary[]>([]);
  const [discover, setDiscover] = useState<CommunitySummary[]>([]);
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [videos, setVideos] = useState<CommunityFeaturedVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const [group, setGroup] = useState<CommunityGroupKey>('overcome');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);
  const [hot, setHot] = useState<HotPerson[]>([]);
  const [searchResult, setSearchResult] = useState<CommunitySearchResult | null>(null);

  useEffect(() => {
    if (!readSession()) {
      setSignedIn(false);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    Promise.all([
      fetchCommunities(),
      fetchCommunityCategories().catch(() => [] as CommunityCategory[]),
      fetchFeaturedVideos().catch(() => [] as CommunityFeaturedVideo[]),
      fetchHotPeople().catch(() => [] as HotPerson[]),
    ])
      .then(([list, cats, vids, people]) => {
        setMine(list.mine);
        setDiscover(list.discover);
        setCategories(cats);
        setVideos(vids);
        setHot(people);
      })
      .catch(() => {
        /* noop */
      })
      .finally(() => setLoading(false));
  }, []);

  // 검색어 디바운스 → 서버 검색(2자 이상).
  const searching = query.trim().length >= 2;
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearchResult(null);
      return;
    }
    const timer = setTimeout(() => {
      searchCommunity(q)
        .then(setSearchResult)
        .catch(() => setSearchResult({ communities: [], posts: [] }));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // categoryId → groupKey 매핑.
  const catGroup = useMemo(() => {
    const m = new Map<string, CommunityGroupKey>();
    for (const c of categories) m.set(c.id, c.groupKey);
    return m;
  }, [categories]);

  const groupCategories = categories.filter((c) => c.groupKey === group);

  // 선택 그룹/카테고리 + 검색어로 필터한 공개 커뮤니티.
  const shownCommunities = useMemo(() => {
    const q = query.trim().toLowerCase();
    return discover.filter((c) => {
      if (categoryId) {
        if (c.categoryId !== categoryId) return false;
      } else if (!c.categoryId || catGroup.get(c.categoryId) !== group) {
        return false;
      }
      if (q && !c.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [discover, categoryId, group, catGroup, query]);

  // 히어로 영상: 카테고리 선택 시 그 카테고리, 아니면 그룹 전체.
  const shownVideos = useMemo(() => {
    return videos.filter((v) => {
      if (categoryId) return v.categoryId === categoryId;
      const g = v.categoryId ? catGroup.get(v.categoryId) : v.groupKey;
      return g === group;
    });
  }, [videos, categoryId, group, catGroup]);

  if (!signedIn && !loading) {
    return (
      <AppShell title={Co.pageTitle} decoration="dots">
        <LoginRequired />
      </AppShell>
    );
  }

  return (
    <AppShell title={Co.pageTitle} decoration="dots">
      <section className="mt-3 flex items-center justify-between gap-2">
        <h1 className="text-base font-bold text-stone-900 dark:text-stone-100">{Co.title}</h1>
        <Link
          href="/community/create"
          className="inline-flex items-center gap-1 rounded-xl bg-stone-900 px-3 py-2 text-[12px] font-semibold text-white dark:bg-white dark:text-stone-900"
        >
          <span>{G.createCta}</span>
          <ChevronRightIcon className="h-3 w-3" />
        </Link>
      </section>

      {/* 검색 */}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={Co.searchPh}
        className="mt-3 block w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
      />

      {searching && <SearchResults result={searchResult} query={query.trim()} Co={Co} />}

      {!searching && (
        <>
      {/* 그룹 탭 */}
      <div className="mt-3 flex gap-1.5">
        {COMMUNITY_GROUP_KEYS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => {
              setGroup(g);
              setCategoryId(null);
              setPlaying(null);
            }}
            className={`flex-1 rounded-xl px-2 py-2 text-[12px] font-bold transition active:scale-[0.98] ${
              group === g
                ? 'bg-stone-900 text-white shadow-sm dark:bg-white dark:text-stone-900'
                : 'bg-white text-stone-600 dark:bg-stone-900 dark:text-stone-300'
            }`}
          >
            {Co.groupTabs[g]}
          </button>
        ))}
      </div>

      {/* 카테고리 칩(가로 스크롤) */}
      <div className="mt-2 -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <Chip active={categoryId === null} onClick={() => setCategoryId(null)}>
          {Co.catAll}
        </Chip>
        {groupCategories.map((cat) => (
          <Chip
            key={cat.id}
            active={categoryId === cat.id}
            onClick={() => {
              setCategoryId(cat.id);
              setPlaying(null);
            }}
          >
            {cat.name}
          </Chip>
        ))}
      </div>

      {/* 오늘의 핫피플 */}
      {hot.length > 0 && <HotPeople people={hot} title={Co.hotPeopleTitle} />}

      {/* 추천 영상 히어로 */}
      {shownVideos.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            {Co.videoTitle}
          </h2>
          <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1">
            {shownVideos.map((v) => {
              const vid = youtubeId(v.videoUrl);
              const isPlaying = playing === v.id;
              return (
                <div key={v.id} className="w-64 shrink-0 snap-start">
                  <div className="card-shadow overflow-hidden rounded-2xl bg-black">
                    <div className="relative aspect-video w-full">
                      {isPlaying && vid ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${vid}?autoplay=1`}
                          title={v.title}
                          allow="accelerated-motion; autoplay; encrypted-media; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 h-full w-full"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => (vid ? setPlaying(v.id) : window.open(v.videoUrl, '_blank'))}
                          className="group absolute inset-0 h-full w-full"
                        >
                          {vid ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`}
                              alt={v.title}
                              className="h-full w-full object-cover transition group-active:scale-[1.02]"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-stone-800" />
                          )}
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur">
                              ▶
                            </span>
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1.5 line-clamp-2 px-0.5 text-[12px] font-medium leading-snug text-stone-800 dark:text-stone-200">
                    {v.title}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {loading && (
        <div className="mt-10 flex justify-center">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-stone-300 border-t-brand-700 dark:border-stone-700 dark:border-t-brand-400" />
        </div>
      )}

      {/* 커뮤니티 카드(발견) */}
      {!loading && (
        <section className="mt-4">
          <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            {G.sectionDiscoverTitle}
          </h2>
          {shownCommunities.length === 0 ? (
            <EmptyCard text={Co.emptyInGroup} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {shownCommunities.map((c) => (
                <CommunityCard key={c.id} community={c} G={G} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 내 커뮤니티 */}
      {!loading && mine.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
            {G.sectionMyTitle}
          </h2>
          <ul className="card-shadow divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
            {mine.map((c) => (
              <CommunityListItem key={c.id} community={c} />
            ))}
          </ul>
        </section>
      )}

      {/* 라운지 */}
      <Link
        href="/community/view?id=_lounge"
        className="card-shadow mt-5 flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-brand-50 to-amber-50 px-4 py-3 transition active:scale-[0.99] dark:from-brand-900/30 dark:to-amber-900/20"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-brand-700 dark:text-brand-200">
            {G.sectionLoungeTitle}
          </p>
          <p className="mt-0.5 text-sm font-bold text-stone-900 dark:text-stone-100">
            {G.loungeBody}
          </p>
        </div>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-stone-500 dark:text-stone-400" />
      </Link>
        </>
      )}

      <div className="mt-4 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 text-[11px] leading-relaxed text-stone-600 dark:border-stone-800 dark:bg-stone-900/60 dark:text-stone-400">
        {Co.disclaimer}
      </div>
    </AppShell>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12px] font-medium transition active:scale-[0.97] ${
        active
          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-900/40 dark:text-brand-200'
          : 'border-stone-200 bg-white text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'
      }`}
    >
      {children}
    </button>
  );
}

function CommunityCard({
  community,
  G,
}: {
  community: CommunitySummary;
  G: { memberCountLabel: string; postCountLabel: string };
}) {
  return (
    <Link
      href={`/community/view?id=${community.id}`}
      className="card-shadow flex flex-col rounded-2xl bg-white p-3 transition active:scale-[0.98] dark:bg-stone-900"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
        <UsersIcon className="h-5 w-5" />
      </span>
      <p className="mt-2 line-clamp-1 text-sm font-bold text-stone-900 dark:text-stone-100">
        {community.name}
      </p>
      {community.description && (
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-stone-500 dark:text-stone-400">
          {community.description}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2 text-[10px] font-medium text-stone-500 dark:text-stone-400">
        <span>
          {G.memberCountLabel} {community.followerCount.toLocaleString()}
        </span>
        <span>·</span>
        <span>
          {G.postCountLabel} {community.postCount.toLocaleString()}
        </span>
      </div>
    </Link>
  );
}

function CommunityListItem({ community }: { community: CommunitySummary }) {
  const { t } = useI18n();
  const G = t.community.groups;
  return (
    <li>
      <Link
        href={`/community/view?id=${community.id}`}
        className="flex items-start gap-3 px-4 py-3 transition active:bg-stone-50 dark:active:bg-stone-800/50"
      >
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700 dark:bg-brand-900 dark:text-brand-200">
          <UsersIcon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
            {community.name}
            <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-400">
              {community.visibility === 'public' ? G.visibilityPublic : G.visibilityPrivate}
            </span>
          </p>
          {community.description && (
            <p className="mt-0.5 line-clamp-1 text-[12px] text-stone-600 dark:text-stone-400">
              {community.description}
            </p>
          )}
          <div className="mt-1 flex items-center gap-3 text-[10px] font-medium text-stone-500 dark:text-stone-400">
            <span>
              {G.memberCountLabel} {community.followerCount.toLocaleString()}
            </span>
            <span>
              {G.postCountLabel} {community.postCount.toLocaleString()}
            </span>
          </div>
        </div>
        <ChevronRightIcon className="h-4 w-4 shrink-0 self-center text-stone-400 dark:text-stone-500" />
      </Link>
    </li>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="card-shadow rounded-2xl bg-white px-4 py-6 text-center text-[12px] text-stone-500 dark:bg-stone-900 dark:text-stone-400">
      {text}
    </div>
  );
}

// 검색어 하이라이트(대소문자 무시).
function Highlight({ text, term }: { text: string; term: string }) {
  if (!term) return <>{text}</>;
  const lower = text.toLowerCase();
  const q = term.toLowerCase();
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;
  while (i < text.length) {
    const idx = lower.indexOf(q, i);
    if (idx < 0) {
      out.push(text.slice(i));
      break;
    }
    if (idx > i) out.push(text.slice(i, idx));
    out.push(
      <mark key={key++} className="rounded bg-amber-200 px-0.5 text-stone-900 dark:bg-amber-400/60">
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    i = idx + q.length;
  }
  return <>{out}</>;
}

function HotPeople({ people, title }: { people: HotPerson[]; title: string }) {
  return (
    <section className="mt-4">
      <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        {title}
      </h2>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {people.map((p, i) => (
          <div key={i} className="w-16 shrink-0 text-center">
            <span
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white ${
                i === 0
                  ? 'bg-gradient-to-br from-amber-400 to-rose-500'
                  : 'bg-gradient-to-br from-brand-400 to-brand-600'
              }`}
            >
              {(p.nickname ?? '?').slice(0, 1)}
            </span>
            <p className="mt-1 truncate text-[10px] font-medium text-stone-700 dark:text-stone-300">
              {p.nickname ?? '—'}
            </p>
            <p className="text-[9px] tabular-nums text-stone-400">♥ {p.likeCount}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function SearchResults({
  result,
  query,
  Co,
}: {
  result: CommunitySearchResult | null;
  query: string;
  Co: { searchResultTitle: string; searchEmpty: string; searchCommsLabel: string; searchPostsLabel: string };
}) {
  const empty = result && result.communities.length === 0 && result.posts.length === 0;
  return (
    <section className="mt-4 space-y-4">
      <h2 className="px-1 text-[11px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
        {Co.searchResultTitle}
      </h2>
      {empty && <EmptyCard text={Co.searchEmpty} />}
      {result && result.communities.length > 0 && (
        <div>
          <p className="mb-1 px-1 text-[10px] font-semibold text-stone-400">{Co.searchCommsLabel}</p>
          <ul className="card-shadow divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white dark:divide-stone-800 dark:bg-stone-900">
            {result.communities.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/community/view?id=${c.id}`}
                  className="block px-4 py-3 transition active:bg-stone-50 dark:active:bg-stone-800/50"
                >
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    <Highlight text={c.name} term={query} />
                  </p>
                  {c.description && (
                    <p className="mt-0.5 line-clamp-1 text-[12px] text-stone-500 dark:text-stone-400">
                      <Highlight text={c.description} term={query} />
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {result && result.posts.length > 0 && (
        <div>
          <p className="mb-1 px-1 text-[10px] font-semibold text-stone-400">{Co.searchPostsLabel}</p>
          <ul className="space-y-2">
            {result.posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/community/post?id=${p.id}`}
                  className="card-shadow block rounded-2xl bg-white px-4 py-3 transition active:scale-[0.99] dark:bg-stone-900"
                >
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    <Highlight text={p.title} term={query} />
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-stone-600 dark:text-stone-400">
                    <Highlight text={p.body} term={query} />
                  </p>
                  <p className="mt-1 text-[10px] text-stone-400">
                    {p.communityName}
                    {p.authorNickname ? ` · ${p.authorNickname}` : ''}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
