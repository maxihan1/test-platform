// Postgres 가 거절하는 글자(NUL · 짝 없는 서로게이트)를 U+FFFD 로 바꾼다 — 글자 하나로 저장 전체가 깨지지 않게

// jsonb 는 \u0000 과 짝 없는 서로게이트 이스케이프를, text 칸은 NUL 을 거절한다. 짝이 맞는 이모지는 그대로 둔다
const 못받는글자 = /\u0000|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

const 글자 = (s: string): string => s.replace(못받는글자, '�');

function 고친다(v: unknown): unknown {
  if (typeof v === 'string') return 글자(v);
  if (Array.isArray(v)) return v.map(고친다);
  if (typeof v !== 'object' || v === null) return v;
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [글자(k), 고친다(x)]));
}

/** JSON 으로 받은 값을 키 · 값 모두 Postgres 가 받는 글자로 바꾼 사본 */
export const jsonb에맞춘다 = <T>(v: T): T => 고친다(v) as T;
