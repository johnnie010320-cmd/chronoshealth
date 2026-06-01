'use client';

import type { RiskSurveyRequest, RiskSurveyResponse } from './schemas';
import type { SignupRequest, SignupResponse } from './signup-schema';
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

// R7a Community
export type CommunityPost = {
  id: string;
  userPseudonymId: string;
  title: string;
  body: string;
  videoUrl: string | null;
  createdAt: string;
  likeCount: number;
  commentCount: number;
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
  title: string;
  body: string;
  videoUrl: string | null;
};

export async function fetchCommunityPosts(
  cursor?: string | null,
  limit = 20,
): Promise<ListPostsResponse> {
  const session = readSession();
  if (!session) throw new Error('UNAUTHORIZED');
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set('cursor', cursor);
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
