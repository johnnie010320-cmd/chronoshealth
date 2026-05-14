import type { RiskSurveyRequest, RiskSurveyResponse } from './schemas';

const GATEWAY_URL =
  'https://chronoshealth-gateway.l2pamerica.workers.dev';

// 모의 토큰. 회원가입 / OAuth 도입 시 교체.
const MOCK_TOKEN = 'beta-mock-token-001';

export async function submitRiskEstimate(
  body: RiskSurveyRequest,
): Promise<RiskSurveyResponse> {
  const res = await fetch(`${GATEWAY_URL}/api/v1/risk-estimate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${MOCK_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errCode = `HTTP_${res.status}`;
    try {
      const data = (await res.json()) as { error?: { code?: string } };
      if (data.error?.code) errCode = data.error.code;
    } catch {
      /* ignore */
    }
    throw new Error(errCode);
  }

  return (await res.json()) as RiskSurveyResponse;
}
