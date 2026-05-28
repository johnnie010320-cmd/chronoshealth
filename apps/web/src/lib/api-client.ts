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
