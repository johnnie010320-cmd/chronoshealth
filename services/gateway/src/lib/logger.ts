// 게이트웨이 공용 로거 — CLAUDE.md 절대규칙 7(console.log 금지 → lib/logger).
// Workers 로그(wrangler tail / Logs)에 한 줄 JSON 으로 남긴다.
// 규칙: 토큰·비밀값·PII(이메일·전화·이름)는 절대 넣지 않는다(gateway CLAUDE.md 절대규칙 4).
//       호출부가 넘기는 fields 는 코드·사유·카운트 같은 비민감 값만.

type LogLevel = 'info' | 'warn' | 'error';
type LogFields = Record<string, string | number | boolean | null | undefined>;

function emit(level: LogLevel, event: string, fields?: LogFields): void {
  const line = JSON.stringify({ level, event, ts: new Date().toISOString(), ...fields });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (event: string, fields?: LogFields) => emit('info', event, fields),
  warn: (event: string, fields?: LogFields) => emit('warn', event, fields),
  error: (event: string, fields?: LogFields) => emit('error', event, fields),
};
