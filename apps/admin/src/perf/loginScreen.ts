// 로그인 화면 찾기 — 성능 페이지 측정과 PRD 초안 미리 로그인이 같이 쓴다. bts/draft.ts 가 perf/pages.ts 의 무거운 가져오기(실행 · pdf)를 끌고 오지 않게 뗐다 (도메인/성능 「잴 페이지」 · BTS-F5-05)

import { 풀 } from './store.js';

/**
 * 화면 기록 · 찾은 화면에서 로그인 화면 경로 하나 — 로그아웃 상태에서 주소나 이름이 로그인인 것.
 * 주소가 로그인 꼴인 줄이 먼저다 — 로그아웃 상태의 /cart 처럼 로그인 창으로 넘겨진 화면도 이름이 「로그인」이라 길이 차례만 보면 그쪽이 뽑힌다
 */
export async function 로그인화면(serviceId: number, env: string): Promise<string | null> {
  const r = await (await 풀()).query<{ url: string }>(
    `SELECT url FROM (
       SELECT url, name FROM screen_record WHERE service_id = $1 AND env = $2 AND state = '로그아웃'
       UNION SELECT url, name FROM screen_found WHERE service_id = $1 AND env = $2 AND state = '로그아웃'
     ) t WHERE url LIKE '/%' AND url NOT LIKE '%:n%' AND (url ~* '(log-?in|sign-?in)' OR name LIKE '%로그인%')
     ORDER BY url !~* '(^|/)(log-?in|sign-?in)($|[/?#.])', length(url), url LIMIT 1`,
    [serviceId, env],
  );
  return r.rows[0]?.url.replace(/ \(구조 다름\)$/, '') ?? null;
}
