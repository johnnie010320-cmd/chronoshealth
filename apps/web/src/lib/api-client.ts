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

// ADR 0014 — same-origin 상대경로. `/api/*` 는 CF Pages Function 프록시가 게이트웨이로 전달.
// same-origin 이므로 쿠키 자동 전송(fetch credentials 기본 'same-origin').
const GATEWAY_URL = '';

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

// ADR 0014 — 로그아웃. httpOnly 쿠키는 서버만 삭제 가능 → /logout 호출로 revoke + 쿠키 삭제.
export async function submitLogout(): Promise<void> {
  try {
    await fetch(`${GATEWAY_URL}/api/v1/auth/logout`, { method: 'POST' });
  } catch {
    // 네트워크 실패해도 클라이언트 세션은 어차피 정리됨 — 무시.
  }
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
  confidence?: number;
  lifetimeMedicalCost?: {
    totalKrw: number;
    perDecadeKrw: number[];
    basis: string;
    modelVersion: string;
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
  nickname: string | null;
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
  marketingOptIn: boolean;
  role: 'user' | 'partner' | 'admin';
  revealed: boolean;
  hasAvatar: boolean;
  avatarUpdatedAt: string | null;
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
  nickname?: string;
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

// 폼코치 SSO — 크로노스 로그인 정보(전화번호)로 폼코치 자동 로그인 링크 발급.
// OK: 발급된 SSO URL(폼코치 워커)로 이동하면 자동 로그인 + 해당 종목 화면.
// NO_PHONE: 전화번호 미등록 → 클라이언트가 2옵션(폼코치 로그인/전화 등록) 노출.
export type FormcoachSsoResult =
  | { status: 'OK'; url: string }
  | { status: 'NO_PHONE'; sport: string };

export async function formcoachSso(sport: string): Promise<FormcoachSsoResult> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(
    `${GATEWAY_URL}/api/v1/formcoach/sso?sport=${encodeURIComponent(sport)}`,
    { headers: { Authorization: `Bearer ${session.sessionToken}` } },
  );
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as FormcoachSsoResult;
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
  isSuperAdmin: boolean;
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

export type AdminRole = 'user' | 'partner' | 'admin';

export type AdminUserRow = {
  userPseudonymId: string;
  name: string | null;
  nickname: string | null;
  email: string;
  phone: string | null;
  role: AdminRole;
  isSuperAdmin: boolean;
  createdAt: string;
  reportCount: number;
  ledgerBalance: number;
};

export type AdminLedgerEntry = {
  txnId: string;
  amount: number;
  kind: string;
  sourceRef: string | null;
  createdAt: string;
};

export type ReleaseEntry = {
  id: string;
  component: string;
  version: string;
  notes: string;
  createdAt: string;
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
  | 'routine_daily'
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
export type RichSegment = {
  t: string;
  b?: true;
  i?: true;
  u?: true;
  c?: string;
  s?: 'sm' | 'lg' | 'xl';
};
export type ImagePosition = 'top' | 'middle' | 'bottom';

export type CommunityPost = {
  id: string;
  communityId: string;
  userPseudonymId: string;
  title: string;
  body: string;
  videoUrl: string | null;
  snsUrl: string | null;
  videoUrls: string[];
  snsUrls: string[];
  imageMime: string | null;
  hasImage: boolean;
  imagePosition: ImagePosition;
  imageData?: string | null;
  bodyRich?: RichSegment[] | null;
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
  acceptsDm: boolean;
  authorNickname: string | null;
  isSelf: boolean;
};

export type ListPostsResponse = {
  posts: CommunityPost[];
  modelVersion: string;
};

export type PostDetailResponse = {
  post: CommunityPost;
  isAuthor: boolean;
  comments: CommunityComment[];
  modelVersion: string;
};

export type CreatePostBody = {
  communityId?: string;
  title: string;
  body: string;
  videoUrl?: string | null;
  videoUrls?: string[];
  snsUrl?: string | null;
  snsUrls?: string[];
  imageB64?: string | null;
  imageMime?: 'image/jpeg' | 'image/png' | 'image/webp' | null;
  imagePosition?: ImagePosition;
  bodyRich?: RichSegment[] | null;
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
  isModerator: boolean;
  myStatus: FollowerStatus | null;
  modelVersion: string;
};

export type CommunityAdminEntry = { pseudonymId: string; nickname: string | null };

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
  acceptsDm = false,
): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/community/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.sessionToken}` },
    body: JSON.stringify({ body, acceptsDm }),
  });
  if (!res.ok) await throwOnError(res);
}

// 작성자 본문 수정.
export async function updateCommunityPost(
  postId: string,
  body: Omit<CreatePostBody, 'communityId'>,
): Promise<{ post: CommunityPost }> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/community/posts/${postId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.sessionToken}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { post: CommunityPost };
}

// 작성자 본문 삭제.
export async function deleteCommunityPost(postId: string): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/community/posts/${postId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
}

// 작성자 댓글 수정.
export async function updateCommunityComment(
  postId: string,
  commentId: string,
  body: string,
  acceptsDm = false,
): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/community/posts/${postId}/comments/${commentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.sessionToken}` },
    body: JSON.stringify({ body, acceptsDm }),
  });
  if (!res.ok) await throwOnError(res);
}

// 작성자 댓글 삭제.
export async function deleteCommunityComment(postId: string, commentId: string): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/community/posts/${postId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
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
export type ExerciseIntensity = 'low' | 'medium' | 'high';

export type RoutineEntry = {
  entryDate: string;
  caloriesKcal: number | null;
  exerciseMinutes: number | null;
  exerciseIntensity?: ExerciseIntensity | null;
  sleepHours: number | null;
  note: string | null;
  // 식단 점수용 영양 데이터(하루 합계). null/미지정 = 미집계.
  proteinG?: number | null;
  carbG?: number | null;
  fatG?: number | null;
  upfTier?: UpfTier | null;
  // 운동 점수 세분화 — 밸런스(운동 종류) + 리커버리(스트레칭 수행). null = 미입력.
  exerciseType?: ExerciseType | null;
  didStretch?: boolean | null;
  // 입력한 음식 항목 목록(항목명·양·칼로리). null = 미입력.
  foodItems?: FoodItem[] | null;
};

export type FoodItem = {
  name: string;
  amount: string;
  calories: number | null;
};

export type ExerciseType = 'cardio' | 'strength' | 'both';

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

export async function deleteRoutineEntry(
  entryDate: string,
): Promise<{ deleted: boolean }> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/routine/${entryDate}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { deleted: boolean };
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

// R-Community owner 권한 — 공개/비공개, 관리자 위임, 모더레이션 삭제.
export async function setCommunityVisibility(
  id: string,
  visibility: CommunityVisibility,
): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/community/communities/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.sessionToken}` },
    body: JSON.stringify({ visibility }),
  });
  if (!res.ok) await throwOnError(res);
}

export async function fetchCommunityAdmins(id: string): Promise<CommunityAdminEntry[]> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/community/communities/${id}/admins`, {
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return ((await res.json()) as { admins: CommunityAdminEntry[] }).admins;
}

export async function addCommunityAdmin(id: string, nickname: string): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/community/communities/${id}/admins`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.sessionToken}` },
    body: JSON.stringify({ nickname }),
  });
  if (!res.ok) await throwOnError(res);
}

export async function removeCommunityAdmin(id: string, pseudonymId: string): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(
    `${GATEWAY_URL}/api/v1/community/communities/${id}/admins/${pseudonymId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${session.sessionToken}` } },
  );
  if (!res.ok) await throwOnError(res);
}

export async function moderatorDeletePost(communityId: string, postId: string): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(
    `${GATEWAY_URL}/api/v1/community/communities/${communityId}/posts/${postId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${session.sessionToken}` } },
  );
  if (!res.ok) await throwOnError(res);
}

export async function moderatorDeleteComment(
  communityId: string,
  commentId: string,
): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(
    `${GATEWAY_URL}/api/v1/community/communities/${communityId}/comments/${commentId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${session.sessionToken}` } },
  );
  if (!res.ok) await throwOnError(res);
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

// 관리자 임명/해제 (superadmin 전용).
export async function setUserRole(id: string, role: AdminRole): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/admin/users/${id}/role`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.sessionToken}` },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) await throwOnError(res);
}

// 회원별 코인(CHRO) 적립/사용 내역.
export async function fetchUserLedger(id: string): Promise<AdminLedgerEntry[]> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/admin/users/${id}/ledger`, {
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return ((await res.json()) as { entries: AdminLedgerEntry[] }).entries;
}

// 개발 로그(releases).
export async function fetchReleases(): Promise<ReleaseEntry[]> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/admin/releases`, {
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return ((await res.json()) as { releases: ReleaseEntry[] }).releases;
}

export async function createRelease(body: {
  component: string;
  version: string;
  notes: string;
}): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/admin/releases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.sessionToken}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwOnError(res);
}

export async function deleteRelease(id: string): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/admin/releases/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
}

// AI 칼로리 추정 — Cloudflare Workers AI (llama-3.1-8b-instruct)
export type UpfTier = 'clean' | 'processed' | 'ultra';
export type CalorieEstimateItem = { name: string; amount: string };
export type CalorieEstimateLine = {
  name: string;
  amount: string;
  calories: number;
  // 식단 점수용 — 매크로(g) + 초가공식품 등급. (구버전 응답 호환 위해 optional)
  proteinG?: number;
  carbG?: number;
  fatG?: number;
  upf?: UpfTier;
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

// 프로필 사진 — base64 (image/jpeg|png|webp, ≤ 256KB)
export type AvatarMime = 'image/jpeg' | 'image/png' | 'image/webp';
export type MyAvatarPhoto = {
  mimeType: AvatarMime;
  dataB64: string;
  byteSize: number;
  updatedAt: string;
};

export async function fetchMyAvatar(): Promise<MyAvatarPhoto | null> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/me/avatar`, {
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as MyAvatarPhoto;
}

export async function uploadMyAvatar(
  mimeType: AvatarMime,
  dataB64: string,
): Promise<{ byteSize: number }> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/me/avatar`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.sessionToken}`,
    },
    body: JSON.stringify({ mimeType, dataB64 }),
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { byteSize: number };
}

export async function deleteMyAvatar(): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/me/avatar`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
}

// Phase 1.1 — 닉네임
export async function checkNicknameAvailable(nickname: string): Promise<boolean> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(
    `${GATEWAY_URL}/api/v1/me/check-nickname?nickname=${encodeURIComponent(nickname)}`,
    { headers: { Authorization: `Bearer ${session.sessionToken}` } },
  );
  if (!res.ok) await throwOnError(res);
  const data = (await res.json()) as { available: boolean };
  return data.available;
}

// Phase 1.2 — 의료 이력
export type ConditionCategory = 'chronic' | 'critical' | 'family';
export type MedicalCondition = {
  code: string;
  category: ConditionCategory;
  granted: boolean;
  updatedAt: string;
};
export type Surgery = {
  id: string;
  surgeryName: string;
  surgeryYear: number | null;
  note: string | null;
  createdAt: string;
};

export async function fetchConditions(): Promise<{
  conditions: MedicalCondition[];
  catalog: Record<ConditionCategory, readonly string[]>;
}> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/me/medical/conditions`, {
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { conditions: MedicalCondition[]; catalog: Record<ConditionCategory, readonly string[]> };
}

export async function saveConditions(
  category: ConditionCategory,
  codes: string[],
): Promise<MedicalCondition[]> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/me/medical/conditions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.sessionToken}` },
    body: JSON.stringify({ category, codes }),
  });
  if (!res.ok) await throwOnError(res);
  const data = (await res.json()) as { conditions: MedicalCondition[] };
  return data.conditions;
}

export async function fetchSurgeries(): Promise<Surgery[]> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/me/medical/surgeries`, {
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return ((await res.json()) as { surgeries: Surgery[] }).surgeries;
}

export async function addSurgery(input: {
  surgeryName: string;
  surgeryYear: number | null;
  note: string | null;
}): Promise<string> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/me/medical/surgeries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.sessionToken}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) await throwOnError(res);
  return ((await res.json()) as { id: string }).id;
}

export async function removeSurgery(id: string): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/me/medical/surgeries/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
}

// Phase 1.3 — 내 댓글
export type MyComment = {
  id: string;
  postId: string;
  postTitle: string;
  body: string;
  createdAt: string;
};
export async function fetchMyComments(): Promise<MyComment[]> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/community/my-comments`, {
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return ((await res.json()) as { comments: MyComment[] }).comments;
}

// Phase 1.4 — AI 건강 처방
export type FormcoachSport =
  | 'running'
  | 'swimming'
  | 'yoga'
  | 'pilates'
  | 'crossfit'
  | 'hiking';

export type AiPrescription = {
  summary: string;
  diet: string[];
  exercise: string[];
  rest: string[];
  // 운동 처방과 연계된 FormCoach 자세교정 종목(딥링크용). 0~3개.
  formcoachSports: FormcoachSport[];
};
export async function fetchAiPrescription(body: {
  bioAge?: number;
  youthAge?: number;
  chronologicalAge?: number;
  risks?: { cvd?: number; diabetes?: number; ckd?: number; dementia?: number; cancer?: number };
  routine?: { caloriesKcal?: number | null; exerciseMinutes?: number | null; sleepHours?: number | null };
  locale: 'ko' | 'en' | 'ja' | 'es';
}): Promise<AiPrescription> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/ai/prescription`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.sessionToken}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwOnError(res);
  return ((await res.json()) as { prescription: AiPrescription }).prescription;
}

// 나의 건강 일기 — 날짜별 저장된 AI 처방 조회.
export type PrescriptionHistoryItem = {
  entryDate: string;
  prescription: AiPrescription | null;
};
export async function fetchPrescriptionHistory(
  from: string,
  to: string,
): Promise<PrescriptionHistoryItem[]> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(
    `${GATEWAY_URL}/api/v1/ai/prescriptions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { headers: { Authorization: `Bearer ${session.sessionToken}` } },
  );
  if (!res.ok) await throwOnError(res);
  return ((await res.json()) as { items: PrescriptionHistoryItem[] }).items;
}

// 자가 진단 — 증상 입력 → 일반 건강 정보(참고). 필수 경고는 UI에서 항상 노출.
export type SymptomAssessment = {
  possibleCauses: string[];
  selfCare: string[];
  seeDoctor: string[];
};
export async function symptomCheck(
  symptoms: string,
  locale: 'ko' | 'en' | 'ja' | 'es',
): Promise<SymptomAssessment> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/ai/symptom-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.sessionToken}` },
    body: JSON.stringify({ symptoms, locale }),
  });
  if (!res.ok) await throwOnError(res);
  return ((await res.json()) as { assessment: SymptomAssessment }).assessment;
}

// Phase 2.2 — MY DIARY
export type DiaryMood = 'great' | 'good' | 'soso' | 'tired' | 'bad';
export type DiaryEntry = {
  id: string;
  entryDate: string;
  mood: DiaryMood | null;
  body: string;
  createdAt: string;
};
export async function fetchDiary(): Promise<DiaryEntry[]> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/me/diary`, {
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  return ((await res.json()) as { entries: DiaryEntry[] }).entries;
}
export async function addDiary(body: {
  entryDate: string;
  mood: DiaryMood | null;
  body: string;
}): Promise<string> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/me/diary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.sessionToken}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwOnError(res);
  return ((await res.json()) as { id: string }).id;
}
export async function removeDiary(id: string): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/me/diary/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
}

// Phase 2.5 — Foodshot
export type FoodshotResult = {
  description: string;
  estimatedItems: {
    name: string;
    amount: string;
    calories: number;
    proteinG?: number;
    carbG?: number;
    fatG?: number;
    upf?: UpfTier;
  }[];
  totalCalories: number;
  modelVersion: string;
};
export async function estimateFoodshot(
  imageB64: string,
  locale: 'ko' | 'en' | 'ja' | 'es',
): Promise<FoodshotResult> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/ai/foodshot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.sessionToken}` },
    body: JSON.stringify({ imageB64, locale }),
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as FoodshotResult;
}

// R9 — 회원간 메시지(DM) + 대화방. ADR 0015 (닉네임 공개 핸들, 폴링 기반).
export type ConversationKind = 'dm' | 'room';

export type ConversationListItem = {
  id: string;
  kind: ConversationKind;
  title: string | null;
  displayName: string | null;
  memberCount: number;
  unreadCount: number;
  lastMessage: { body: string; createdAt: string; senderNickname: string | null } | null;
  createdAt: string;
};

export type ConversationDetail = {
  id: string;
  kind: ConversationKind;
  title: string | null;
  displayName: string | null;
  isOwner: boolean;
  createdAt: string;
};

export type ConversationMember = {
  nickname: string | null;
  role: 'owner' | 'member';
  isMe: boolean;
};

export type ChatAttachment = {
  name: string;
  type: string;
  size: number;
  expiresAt: string | null;
};
// 카카오톡식 고정 반응 6종 — 게이트웨이 schemas/messaging.ts 의 REACTION_EMOJIS 와 동일.
export const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export type ChatReaction = { emoji: string; count: number; mine: boolean };

export type ChatReplyPreview = {
  id: string;
  senderNickname: string | null;
  bodyPreview: string;
};

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderNickname: string | null;
  isMine: boolean;
  // 안읽은 수신자 수(카카오톡식). 0이면 모두 읽음 → UI 미표시.
  unreadCount: number;
  attachment: ChatAttachment | null;
  // 답장 대상 미리보기(있으면).
  replyTo: ChatReplyPreview | null;
  // 이모티콘 반응 집계.
  reactions: ChatReaction[];
};

function authHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function openDm(nickname: string): Promise<{ conversation: ConversationDetail }> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/messages/dm`, {
    method: 'POST',
    headers: authHeaders(session.sessionToken),
    body: JSON.stringify({ nickname }),
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { conversation: ConversationDetail };
}

export async function createRoom(
  title: string,
  inviteNicknames: string[],
): Promise<{ conversation: ConversationDetail }> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/messages/rooms`, {
    method: 'POST',
    headers: authHeaders(session.sessionToken),
    body: JSON.stringify({ title, inviteNicknames }),
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { conversation: ConversationDetail };
}

export async function fetchConversations(): Promise<ConversationListItem[]> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/messages/conversations`, {
    method: 'GET',
    headers: authHeaders(session.sessionToken),
  });
  if (!res.ok) await throwOnError(res);
  return ((await res.json()) as { conversations: ConversationListItem[] }).conversations;
}

export async function fetchConversation(
  id: string,
): Promise<{ conversation: ConversationDetail; members: ConversationMember[] }> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/messages/conversations/${id}`, {
    method: 'GET',
    headers: authHeaders(session.sessionToken),
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as {
    conversation: ConversationDetail;
    members: ConversationMember[];
  };
}

export async function fetchMessages(
  id: string,
  before?: string,
): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const qs = before ? `?before=${encodeURIComponent(before)}` : '';
  const res = await fetch(`${GATEWAY_URL}/api/v1/messages/conversations/${id}/messages${qs}`, {
    method: 'GET',
    headers: authHeaders(session.sessionToken),
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { messages: ChatMessage[]; hasMore: boolean };
}

export async function sendMessage(
  id: string,
  body: string,
  replyToMessageId?: string | null,
): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/messages/conversations/${id}/messages`, {
    method: 'POST',
    headers: authHeaders(session.sessionToken),
    body: JSON.stringify({ body, replyToMessageId: replyToMessageId ?? null }),
  });
  if (!res.ok) await throwOnError(res);
}

// 이모티콘 반응 추가/제거(토글). 같은 이모지를 이미 달았으면 제거.
export async function addMessageReaction(
  conversationId: string,
  messageId: string,
  emoji: string,
): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(
    `${GATEWAY_URL}/api/v1/messages/conversations/${conversationId}/messages/${messageId}/reactions`,
    {
      method: 'POST',
      headers: authHeaders(session.sessionToken),
      body: JSON.stringify({ emoji }),
    },
  );
  if (!res.ok) await throwOnError(res);
}

export async function removeMessageReaction(
  conversationId: string,
  messageId: string,
  emoji: string,
): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(
    `${GATEWAY_URL}/api/v1/messages/conversations/${conversationId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`,
    { method: 'DELETE', headers: authHeaders(session.sessionToken) },
  );
  if (!res.ok) await throwOnError(res);
}

export async function markConversationRead(id: string): Promise<void> {
  const session = readSession();
  if (!session) return;
  await fetch(`${GATEWAY_URL}/api/v1/messages/conversations/${id}/read`, {
    method: 'POST',
    headers: authHeaders(session.sessionToken),
  });
}

// 파일 첨부 업로드(jpg/pdf/ppt). FormData 멀티파트.
export async function uploadMessageFile(
  id: string,
  file: File,
): Promise<{ message: ChatMessage }> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${GATEWAY_URL}/api/v1/messages/conversations/${id}/files`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.sessionToken}` },
    body: form,
  });
  if (!res.ok) await throwOnError(res);
  return (await res.json()) as { message: ChatMessage };
}

// 첨부 다운로드 — 인증 헤더로 blob 받아 저장 트리거(비공개라 직접 링크 불가).
export async function downloadMessageFile(messageId: string, fileName: string): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/messages/files/${messageId}`, {
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) await throwOnError(res);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'file';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// 본인이 보낸 메시지 삭제.
export async function deleteMessage(conversationId: string, messageId: string): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(
    `${GATEWAY_URL}/api/v1/messages/conversations/${conversationId}/messages/${messageId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${session.sessionToken}` } },
  );
  if (!res.ok) await throwOnError(res);
}

export async function fetchUnreadTotal(): Promise<number> {
  const session = readSession();
  if (!session) return 0;
  const res = await fetch(`${GATEWAY_URL}/api/v1/messages/unread-total`, {
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  });
  if (!res.ok) return 0;
  return ((await res.json()) as { total: number }).total;
}

export async function inviteToRoom(id: string, nickname: string): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/messages/conversations/${id}/invite`, {
    method: 'POST',
    headers: authHeaders(session.sessionToken),
    body: JSON.stringify({ nickname }),
  });
  if (!res.ok) await throwOnError(res);
}

export async function leaveConversation(id: string): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/messages/conversations/${id}/leave`, {
    method: 'POST',
    headers: authHeaders(session.sessionToken),
  });
  if (!res.ok) await throwOnError(res);
}

// 대화방 삭제 — 생성자 전용(모든 참여자에서 사라짐).
export async function deleteConversation(id: string): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/messages/conversations/${id}`, {
    method: 'DELETE',
    headers: authHeaders(session.sessionToken),
  });
  if (!res.ok) await throwOnError(res);
}

// 닉네임 자동검색 — 기존 회원 선택용(DM/대화방 초대/커뮤니티 관리자 지정). 닉네임만 반환.
export async function searchMembers(q: string): Promise<string[]> {
  const session = readSession();
  if (!session) return [];
  const res = await fetch(
    `${GATEWAY_URL}/api/v1/members/search?q=${encodeURIComponent(q)}`,
    { headers: authHeaders(session.sessionToken) },
  );
  if (!res.ok) return [];
  return ((await res.json()) as { nicknames: string[] }).nicknames;
}

// R-Admin — 공지사항. 공개 조회는 로그인 불필요.
export type Notice = {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  // 첨부 — 이미지(인라인), 파일(PDF 다운로드), 외부 링크.
  hasImage?: boolean;
  imageType?: string | null;
  fileName?: string | null;
  linkUrl?: string | null;
};

// 공개 첨부 스트림 URL(인증 불필요).
export function noticeImageUrl(id: string): string {
  return `${GATEWAY_URL}/api/v1/notices/${id}/image`;
}
export function noticeFileUrl(id: string): string {
  return `${GATEWAY_URL}/api/v1/notices/${id}/file`;
}

export async function fetchNotices(): Promise<Notice[]> {
  const res = await fetch(`${GATEWAY_URL}/api/v1/notices`, { method: 'GET' });
  if (!res.ok) await throwOnError(res);
  return ((await res.json()) as { notices: Notice[] }).notices;
}

export async function fetchAdminNotices(): Promise<Notice[]> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/admin/notices`, {
    headers: authHeaders(session.sessionToken),
  });
  if (!res.ok) await throwOnError(res);
  return ((await res.json()) as { notices: Notice[] }).notices;
}

export async function createNotice(body: {
  title: string;
  body: string;
  pinned: boolean;
  published: boolean;
  linkUrl?: string | null;
}): Promise<Notice> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/admin/notices`, {
    method: 'POST',
    headers: authHeaders(session.sessionToken),
    body: JSON.stringify(body),
  });
  if (!res.ok) await throwOnError(res);
  return ((await res.json()) as { notice: Notice }).notice;
}

export async function updateNotice(
  id: string,
  patch: {
    title?: string;
    body?: string;
    pinned?: boolean;
    published?: boolean;
    linkUrl?: string | null;
  },
): Promise<Notice> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/admin/notices/${id}`, {
    method: 'PATCH',
    headers: authHeaders(session.sessionToken),
    body: JSON.stringify(patch),
  });
  if (!res.ok) await throwOnError(res);
  return ((await res.json()) as { notice: Notice }).notice;
}

export async function deleteNotice(id: string): Promise<void> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const res = await fetch(`${GATEWAY_URL}/api/v1/admin/notices/${id}`, {
    method: 'DELETE',
    headers: authHeaders(session.sessionToken),
  });
  if (!res.ok) await throwOnError(res);
}

// 공지 첨부 업로드/삭제 (관리자). kind: 'image'(png/jpg/webp) | 'file'(pdf).
async function noticeAttachment(
  id: string,
  kind: 'image' | 'file',
  method: 'POST' | 'DELETE',
  file?: File,
): Promise<Notice> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const init: RequestInit = {
    method,
    headers: { Authorization: `Bearer ${session.sessionToken}` },
  };
  if (method === 'POST' && file) {
    const form = new FormData();
    form.append('file', file);
    init.body = form;
  }
  const res = await fetch(`${GATEWAY_URL}/api/v1/admin/notices/${id}/${kind}`, init);
  if (!res.ok) await throwOnError(res);
  return ((await res.json()) as { notice: Notice }).notice;
}

export function uploadNoticeImage(id: string, file: File): Promise<Notice> {
  return noticeAttachment(id, 'image', 'POST', file);
}
export function deleteNoticeImage(id: string): Promise<Notice> {
  return noticeAttachment(id, 'image', 'DELETE');
}
export function uploadNoticeFile(id: string, file: File): Promise<Notice> {
  return noticeAttachment(id, 'file', 'POST', file);
}
export function deleteNoticeFile(id: string): Promise<Notice> {
  return noticeAttachment(id, 'file', 'DELETE');
}
