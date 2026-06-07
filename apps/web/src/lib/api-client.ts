'use client';

import type { RiskSurveyRequest, RiskSurveyResponse } from './schemas';
import type {
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  SetPasswordRequest,
} from './signup-schema';
import { readSession } from './session';

const GATEWAY_URL =
  'https://chronoshealth-gateway.l2pamerica.workers.dev';

async function throwOnError(res: Response): Promise<never> {
  let errCode = `HTTP_${res.status}`;
  try {
    const data = (await res.json()) as { error?: { code?: string } };
    if (data.error?.code) errCode = data.error.code;
  } catch {
    /* ignore */
  }
  throw new Error(errCode);
}

export async function submitRiskEstimate(
  body: RiskSurveyRequest,
): Promise<RiskSurveyResponse> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');

  const res = await fetch(`${GATEWAY_URL}/api/v1/risk-estimate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.sessionToken}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) await throwOnError(res);
  return (await res.json()) as RiskSurveyResponse;
}

export async function submitSignup(
  body: SignupRequest,
): Promise<SignupResponse> {
  const res = await fetch(`${GATEWAY_URL}/api/v1/auth/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) await throwOnError(res);
  return (await res.json()) as SignupResponse;
}

// ADR 0012 — 로그인 / 비밀번호 설정.
export async function submitLogin(body: LoginRequest): Promise<LoginResponse> {
  const res = await fetch(`${GATEWAY_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as LoginResponse;
}

export async function submitSetPassword(
  body: SetPasswordRequest,
): Promise<LoginResponse> {
  const res = await fetch(`${GATEWAY_URL}/api/v1/auth/set-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as LoginResponse;
}

// 콘텐츠 페이지 (약관 / 개인정보 처리방침)
export type ContentSlug = 'terms' | 'privacy' | 'medical_disclaimer' | 'operator_info';

export type ContentPage = {
  slug: ContentSlug;
  locale: 'ko' | 'en' | 'ja' | 'es';
  title: string;
  bodyMd: string;
  version: string;
  updatedAt: string;
};

export async function fetchContentPage(
  slug: ContentSlug,
  locale: 'ko' | 'en' | 'ja' | 'es',
): Promise<ContentPage> {
  const res = await fetch(
    `${GATEWAY_URL}/api/v1/content/${slug}?locale=${locale}`,
    { method: 'GET' },
  );
  if (!res.ok) await throwOnError(res);
  const data = (await res.json()) as { page: ContentPage };
  return data.page;
}

export type AdminContentPage = ContentPage & { updatedByPseudonymId: string };

export async function fetchAdminContentList(): Promise<{ pages: AdminContentPage[] }> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/admin/content`, {
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { pages: AdminContentPage[] };
}

export async function submitAdminContentUpsert(body: {
  slug: ContentSlug;
  locale: 'ko' | 'en' | 'ja' | 'es';
  title: string;
  bodyMd: string;
  version: string;
}): Promise<{ page: AdminContentPage }> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/admin/content`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.sessionToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { page: AdminContentPage };
}

// ADR 0011 / roadmap-ui.md Slice R3
export type BetaSignupRequest = {
  email: string;
  country: string;
  ageGroup: '19-29' | '30-39' | '40-49' | '50-59' | '60+';
  interestedModules: string[];
  locale: 'ko' | 'en' | 'ja' | 'es';
  consentPii: boolean;
  consentMedicalDisclaimer: boolean;
  consentTokenReview: boolean;
};

export type BetaSignupResponse = {
  id: string;
  registeredAt: string;
};

export async function submitBetaSignup(
  body: BetaSignupRequest,
): Promise<BetaSignupResponse> {
  const res = await fetch(`${GATEWAY_URL}/api/v1/beta-signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) await throwOnError(res);
  return (await res.json()) as BetaSignupResponse;
}

// M7 Simulation
export type SimulateOverrides = {
  exerciseMinutesPerWeek?: number;
  sleepHoursPerNight?: number;
  alcoholDrinksPerWeek?: number;
  smoking?: 'never' | 'former' | 'current';
  weightKg?: number;
  stressLevel?: 'low' | 'medium' | 'high';
};

export type SimulateResponse = {
  baseline: RiskSurveyResponse;
  simulated: RiskSurveyResponse;
  delta: {
    bioAgeYears: number;
    predictedYearsRemaining: { median: number; ci95: [number, number] };
    diseaseRiskPctPoints: {
      cvd: number;
      diabetes: number;
      ckd: number;
      dementia: number;
      cancer: number;
    };
  };
  disclaimer: string;
  modelVersion: string;
};

export async function submitSimulate(
  base: RiskSurveyRequest,
  overrides: SimulateOverrides,
): Promise<SimulateResponse> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');

  const res = await fetch(`${GATEWAY_URL}/api/v1/simulate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.sessionToken}`,
    },
    body: JSON.stringify({ base, overrides }),
  });

  if (!res.ok) await throwOnError(res);
  return (await res.json()) as SimulateResponse;
}

// M8 Avatar
export type AvatarResponse = {
  name: string;
  chronologicalAge: number;
  vitalityScore: {
    value: number;
    tier: 'excellent' | 'good' | 'fair' | 'attention';
  };
  predictedYearsRemaining: { median: number; ci95: [number, number] };
  fiveAges: {
    life: number;
    vitality: number;
    skin: number;
    vascular: number;
    joint: number;
  };
  lastReportAt: string;
  modelVersion: string;
  disclaimer: string;
};

export async function fetchAvatarMe(): Promise<AvatarResponse> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');

  const res = await fetch(`${GATEWAY_URL}/api/v1/avatar/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as AvatarResponse;
}

// M6 Leaderboard
export type LeaderboardResponse = {
  scope: 'world' | 'country';
  country?: 'KR' | 'US' | 'JP' | 'ES' | 'OTHER';
  ageBand: string;
  sex: 'male' | 'female' | 'other';
  userVitalityScore: number;
  vitalityTier: 'excellent' | 'good' | 'fair' | 'attention';
  percentile: number;
  rankWithin: { value: number; total: number };
  tierDistribution: {
    excellent: number;
    good: number;
    fair: number;
    attention: number;
  };
  delta: { monthOverMonth: null; nextTierGap: number };
  modelVersion: string;
  disclaimer: string;
};

// 본인 PII 조회 (마스킹 / reveal) — ADR 0013: 본인정보 NULL 허용
export type MeProfile = {
  userPseudonymId: string;
  name: string | null;
  email: string;
  phone: string | null;
  birthYear: number | null;
  sex: 'male' | 'female' | 'other' | null;
  nationality: string | null;
  createdAt: string;
  consentTermsVersion: string | null;
  consentPrivacyVersion: string | null;
  consentRecordedAt: string | null;
  isProfileComplete: boolean;
  revealed: boolean;
};

export async function fetchMeProfile(reveal: boolean): Promise<{ profile: MeProfile }> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const url = `${GATEWAY_URL}/api/v1/me${reveal ? '?reveal=1' : ''}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { profile: MeProfile };
}

// ADR 0013 — Step 2 본인정보 입력/갱신
export type ProfileUpdateBody = {
  name: string;
  phone: string;
  birthYear: number;
  sex: 'male' | 'female' | 'other';
  nationality: 'KR' | 'US' | 'JP' | 'ES' | 'OTHER';
};

export async function submitProfileUpdate(
  body: ProfileUpdateBody,
): Promise<{ profile: MeProfile }> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/me/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.sessionToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { profile: MeProfile };
}

// 회원가입 폼 — 이메일 중복 확인
export async function checkEmailAvailable(email: string): Promise<boolean> {
  const res = await fetch(
    `${GATEWAY_URL}/api/v1/auth/check-email?email=${encodeURIComponent(email)}`,
  );
  if (!res.ok) {
    // 400/429 모두 false 처리 — 안전하게 진행 차단 안 함
    return true;
  }
  const data = (await res.json()) as { available: boolean };
  return data.available;
}

// R-Admin-1
export type AdminWhoami = {
  userPseudonymId: string;
  isAdmin: boolean;
};

export type AdminStats = {
  totalUsers: number;
  totalBetaSignups: number;
  totalRiskReports: number;
  totalCommunityPosts: number;
  totalCommunityComments: number;
  totalLikes: number;
  totalLedgerEntries: number;
  totalLedgerSum: number;
};

export type AdminUserRow = {
  userPseudonymId: string;
  emailMasked: string;
  createdAt: string;
  reportCount: number;
  ledgerBalance: number;
};

export type AdminUserDetail = {
  userPseudonymId: string;
  createdAt: string;
  name: string | null;
  emailMasked: string | null;
  phoneMasked: string | null;
};

export type AdminBetaSignupRow = {
  id: string;
  emailPseudonym: string;
  country: string;
  ageGroup: string;
  interestedModules: string;
  locale: string;
  createdAt: string;
};

export async function fetchAdminWhoami(): Promise<AdminWhoami> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/admin/whoami`, {
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as AdminWhoami;
}

export async function fetchAdminStats(): Promise<{ stats: AdminStats }> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/admin/stats`, {
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { stats: AdminStats };
}

export async function fetchAdminUsers(
  search?: string,
): Promise<{ users: AdminUserRow[] }> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const qs = new URLSearchParams();
  if (search) qs.set('search', search);
  const res = await fetch(
    `${GATEWAY_URL}/api/v1/admin/users${qs.toString() ? `?${qs.toString()}` : ''}`,
    { headers: { Authorization: `Bearer ${session.sessionToken}` } },
  );
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { users: AdminUserRow[] };
}

export async function fetchAdminUserDetail(
  id: string,
  unmask: boolean,
): Promise<{ detail: AdminUserDetail }> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(
    `${GATEWAY_URL}/api/v1/admin/users/${id}${unmask ? '?unmask=1' : ''}`,
    { headers: { Authorization: `Bearer ${session.sessionToken}` } },
  );
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { detail: AdminUserDetail };
}

export async function fetchAdminBetaSignups(): Promise<{
  signups: AdminBetaSignupRow[];
}> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/admin/beta-signups`, {
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { signups: AdminBetaSignupRow[] };
}

// R8 Rewards
export type LedgerKind =
  | 'survey_complete'
  | 'routine_streak_7'
  | 'community_post'
  | 'community_comment'
  | 'community_like_received'
  | 'spend_coupon'
  | 'admin_adjust';

export type LedgerEntry = {
  txnId: string;
  amount: number;
  kind: LedgerKind;
  sourceRef: string | null;
  createdAt: string;
};

export type SpendItem = {
  slug: string;
  cost: number;
  partner: string;
  title: string;
  body: string;
};

export type RewardsMeResponse = {
  balance: number;
  history: LedgerEntry[];
  spendCatalog: SpendItem[];
  earnRules: Partial<Record<LedgerKind, number>>;
  modelVersion: string;
  disclaimer: string;
};

export async function fetchRewardsMe(
  locale: 'ko' | 'en' | 'ja' | 'es',
): Promise<RewardsMeResponse> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/rewards/me?locale=${locale}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as RewardsMeResponse;
}

export type SpendResponse = {
  txnId: string;
  spent: number;
  item: { slug: string; partner: string };
  newBalance: number;
};

export async function submitRewardsSpend(slug: string): Promise<SpendResponse> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/rewards/spend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.sessionToken}` },
    body: JSON.stringify({ slug }),
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as SpendResponse;
}

// R7a Community
export type CommunityPost = {
  id: string;
  communityId: string;
  userPseudonymId: string;
  title: string;
  body: string;
  videoUrl: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  allowLikes: boolean;
  allowComments: boolean;
};

export type CommunityComment = {
  id: string;
  postId: string;
  userPseudonymId: string;
  body: string;
  createdAt: string;
};

export type ListPostsResponse = {
  posts: CommunityPost[];
  modelVersion: string;
};

export type PostDetailResponse = {
  post: CommunityPost;
  comments: CommunityComment[];
  modelVersion: string;
};

export type CreatePostBody = {
  communityId?: string;
  title: string;
  body: string;
  videoUrl: string | null;
  allowLikes?: boolean;
  allowComments?: boolean;
};

export type CommunityVisibility = 'public' | 'private';
export type FollowerStatus = 'active' | 'pending';

export type CommunitySummary = {
  id: string;
  ownerPseudonymId: string;
  name: string;
  description: string;
  visibility: CommunityVisibility;
  allowLikesDefault: boolean;
  allowCommentsDefault: boolean;
  followerCount: number;
  postCount: number;
  createdAt: string;
};

export type CommunityListResponse = {
  mine: CommunitySummary[];
  discover: CommunitySummary[];
  modelVersion: string;
};

export type CommunityDetailResponse = {
  community: CommunitySummary;
  isOwner: boolean;
  myStatus: FollowerStatus | null;
  modelVersion: string;
};

export type CreateCommunityBody = {
  name: string;
  description: string;
  visibility: CommunityVisibility;
  allowLikesDefault: boolean;
  allowCommentsDefault: boolean;
};

export type AdminCommunityListResponse = {
  communities: CommunitySummary[];
  modelVersion: string;
};

export async function fetchCommunityPosts(
  cursor?: string | null,
  limit = 20,
  communityId?: string,
): Promise<ListPostsResponse> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set('cursor', cursor);
  if (communityId) qs.set('communityId', communityId);
  const res = await fetch(`${GATEWAY_URL}/api/v1/community/posts?${qs.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as ListPostsResponse;
}

export async function fetchCommunityTrending(): Promise<ListPostsResponse> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/community/trending`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as ListPostsResponse;
}

export async function fetchCommunityPost(id: string): Promise<PostDetailResponse> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/community/posts/${id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as PostDetailResponse;
}

export async function createCommunityPost(body: CreatePostBody): Promise<{ post: CommunityPost }> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/community/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.sessionToken}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { post: CommunityPost };
}

export async function addCommunityComment(
  postId: string,
  body: string,
): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/community/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.sessionToken}` },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) await throwOnError(res);
}

export async function toggleCommunityLike(postId: string): Promise<{ liked: boolean }> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/community/posts/${postId}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { liked: boolean };
}

// R6 Routine
export type RoutineEntry = {
  entryDate: string;
  caloriesKcal: number | null;
  exerciseMinutes: number | null;
  sleepHours: number | null;
  note: string | null;
};

export type RoutineSummary = {
  from: string;
  to: string;
  days: number;
  totals: { calories: number; exerciseMinutes: number; sleepHours: number };
  averages: { calories: number; exerciseMinutes: number; sleepHours: number };
  streakDays: number;
};

export type RoutineRangeResponse = {
  entries: RoutineEntry[];
  summary: RoutineSummary;
  modelVersion: string;
};

export type RoutineTodayResponse = {
  entry: RoutineEntry | null;
  today: string;
  modelVersion: string;
};

export type RoutineUpsertResponse = {
  entry: RoutineEntry | null;
  modelVersion: string;
};

export async function fetchRoutineToday(): Promise<RoutineTodayResponse> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/routine/today`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as RoutineTodayResponse;
}

export async function fetchRoutineRange(
  from: string,
  to: string,
): Promise<RoutineRangeResponse> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const qs = new URLSearchParams({ from, to });
  const res = await fetch(`${GATEWAY_URL}/api/v1/routine/range?${qs.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as RoutineRangeResponse;
}

export async function submitRoutineDaily(
  body: RoutineEntry,
): Promise<RoutineUpsertResponse> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/routine/daily`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.sessionToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as RoutineUpsertResponse;
}

// M5 Care
export type CareSeverity = 'info' | 'recommend' | 'attention';

export type CareRule = { ruleId: string; severity: CareSeverity };

export type CareAffiliate = {
  slug: string;
  category: 'diet' | 'exercise' | 'medical';
  partner: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
};

export type CareContext = {
  bmi: number | null;
  age: number;
  exerciseMinutesPerWeek: number;
  alcoholDrinksPerWeek: number;
  smoking: 'never' | 'former' | 'current';
  sleepHoursPerNight: number;
  stressLevel: 'low' | 'medium' | 'high';
};

export type CareResponse = {
  diet: { rules: CareRule[]; affiliates: CareAffiliate[] };
  exercise: { rules: CareRule[]; affiliates: CareAffiliate[] };
  medical: { rules: CareRule[]; affiliates: CareAffiliate[] };
  context: CareContext;
  modelVersion: string;
  disclaimer: string;
};

export async function fetchCareMe(
  locale: 'ko' | 'en' | 'ja' | 'es',
): Promise<CareResponse> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');

  const res = await fetch(`${GATEWAY_URL}/api/v1/care/me?locale=${locale}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as CareResponse;
}

export async function fetchLeaderboardMe(
  scope: 'world' | 'country',
  country?: 'KR' | 'US' | 'JP' | 'ES' | 'OTHER',
): Promise<LeaderboardResponse> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');

  const qs = new URLSearchParams({ scope });
  if (scope === 'country' && country) qs.set('country', country);

  const res = await fetch(
    `${GATEWAY_URL}/api/v1/leaderboard/me?${qs.toString()}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${session.sessionToken}` },
    },
  );
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as LeaderboardResponse;
}

// R7c — Community groups (Instagram-style follow + public/private)

export async function fetchCommunities(): Promise<CommunityListResponse> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/community/communities`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as CommunityListResponse;
}

export async function fetchCommunity(id: string): Promise<CommunityDetailResponse> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/community/communities/${id}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as CommunityDetailResponse;
}

export async function createCommunity(
  body: CreateCommunityBody,
): Promise<{ community: CommunitySummary }> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/community/communities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.sessionToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { community: CommunitySummary };
}

export async function toggleCommunityFollow(
  id: string,
): Promise<{ following: boolean; status: FollowerStatus | null }> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/community/communities/${id}/follow`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { following: boolean; status: FollowerStatus | null };
}

export async function fetchAdminCommunities(): Promise<AdminCommunityListResponse> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/admin/communities`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as AdminCommunityListResponse;
}

export async function deleteAdminCommunity(id: string): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/admin/communities/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
}

// AI 칼로리 추정 — Cloudflare Workers AI (llama-3.1-8b-instruct)
export type CalorieEstimateItem = { name: string; amount: string };
export type CalorieEstimateLine = {
  name: string;
  amount: string;
  calories: number;
};
export type CalorieEstimateResponse = {
  breakdown: CalorieEstimateLine[];
  totalCalories: number;
  modelVersion: string;
};

export async function estimateCalories(
  items: CalorieEstimateItem[],
  locale: 'ko' | 'en' | 'ja' | 'es',
): Promise<CalorieEstimateResponse> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/ai/estimate-calories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.sessionToken}`,
    },
    body: JSON.stringify({ items, locale }),
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as CalorieEstimateResponse;
}
