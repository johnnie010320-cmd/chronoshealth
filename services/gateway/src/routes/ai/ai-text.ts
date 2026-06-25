// Workers AI 텍스트 응답 추출 — 모델별 응답 형식 차이를 흡수.
//
// 구 모델(@cf/meta/llama-3.1-8b-instruct 등): { response: string }
// 현행 모델(@cf/meta/llama-3.3-70b-instruct-fp8-fast 등, OpenAI 호환):
//   { choices: [{ message: { content: string } }] }
// 2026-05-30 구 모델 폐기로 후자로 전환 → 두 형식 모두 지원해야 함.
export function aiText(res: unknown): string {
  if (!res || typeof res !== 'object') return '';
  const r = res as {
    response?: unknown;
    choices?: Array<{ message?: { content?: unknown }; text?: unknown }>;
  };
  if (typeof r.response === 'string') return r.response;
  const choice = r.choices?.[0];
  if (choice) {
    if (typeof choice.message?.content === 'string') return choice.message.content;
    if (typeof choice.text === 'string') return choice.text;
  }
  return '';
}
