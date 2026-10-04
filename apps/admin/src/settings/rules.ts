// 서비스 설정 「훑지 않을 경로」 값 규칙의 한 자리 — 설정 API · 설정 화면 · 작성 에이전트(크롤러)가 같은 규칙을 쓴다 (SPEC 도메인/인증 §7 · 2026-10-04)
// fastify 를 끌어오지 않는다 — 화면 번들과 scripts/ 가 그대로 가져다 쓴다 (선례 auth/rules.ts)

/**
 * 마디마다 글자 · 숫자 · `.` `_` `~` `%` `-` 만. 값이 작성 자식의 크롤러 명령줄에 들어가므로 셸 글자(`;` `$` 백틱 따옴표 공백)를 받지 않는다.
 * 단독 `/` · 빈 마디(`//`) · 쿼리 · 해시도 안 받는다 — 경로만 뺀다
 */
export const 제외경로모양 = /^(?:\/[\p{L}\p{N}._~%-]+)+$/u;
export const 제외경로최대글자 = 100;
export const 제외경로최대개수 = 20;

export type 제외경로정리결과 = { 값: string[] } | { 틀린줄: string; 까닭: '모양' | '길이' | '개수' };

/** 적은 줄을 저장할 목록으로 — 앞뒤 공백 · 빈 줄 · 끝의 `/` 를 걷고 같은 것은 하나로. 틀린 첫 줄을 돌려준다 */
export function 제외경로정리(줄들: readonly string[]): 제외경로정리결과 {
  const 값: string[] = [];
  for (const 원래 of 줄들) {
    const 줄 = 원래.trim();
    if (줄 === '') continue;
    const 걷은 = 줄.length > 1 ? 줄.replace(/\/+$/, '') : 줄;
    if (걷은.length > 제외경로최대글자) return { 틀린줄: 줄, 까닭: '길이' };
    if (!제외경로모양.test(걷은)) return { 틀린줄: 줄, 까닭: '모양' };
    if (값.includes(걷은)) continue;
    if (값.length >= 제외경로최대개수) return { 틀린줄: 줄, 까닭: '개수' };
    값.push(걷은);
  }
  return { 값 };
}

const 풀기 = (글: string): string => {
  try {
    return decodeURIComponent(글);
  } catch {
    return 글;
  }
};

/** 주소 경로(pathname)가 목록의 경로이거나 그 아래인가 — 마디 경계로(`/daejeon` 은 `/daejeonx` 를 안 뺀다). 인코딩은 풀어서, 대소문자는 가른다 */
export function 제외되나(경로: string, 목록: readonly string[]): boolean {
  const p = 풀기(경로);
  return 목록.some((x) => {
    const 뺄 = 풀기(x);
    return p === 뺄 || p.startsWith(`${뺄}/`);
  });
}
