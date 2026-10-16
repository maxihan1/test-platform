// 서비스 지도 — 대상 서비스가 부르는 같은 사이트 API 와 그 API 를 거친 케이스 · 화면 (도메인/작성 §3.6 「서비스 지도」)
// 케이스 줄은 trace 적재(execution/traceIngest.ts)가, 화면 줄은 화면 기록 통로(prd/screens.ts)가 채운다. 관찰한 API 는 기대값의 근거가 아니다 — 대기 조건 · 실패 가르기 · 지도에만 쓴다

import type { ScenarioDeleteStatus } from '@platform/kit';
import type { PoolClient } from 'pg';

import { db } from '../settings/store.js';

export interface API줄 {
  method: string;
  host: string;
  path: string;
}

// 화면 하나 · 항목 하나가 올리는 API 수. 무한 스크롤 · 폴링이 지도를 덮지 않게
export const 지도상한 = 200;

const 숫자칸 = /^\d+$/;
const uuid칸 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const 긴16진 = /^[0-9a-f]{16,}$/i;

/**
 * 주소 → (호스트, 주소 틀). 숫자 칸은 `:n`, uuid · 16자 넘는 16진 칸은 `:id`, 물음표 · # 뒤는 뺀다. http(s) 가 아니면 null.
 * 화면 틀(`틀키`)과 따로 둔다 — 화면은 물음표 뒤를 남기고(게시판 `?bo_table=`), API 는 뺀다(토큰 · 검색어)
 */
export function API틀(url: string): { host: string; path: string } | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const 칸들 = u.pathname.split('/').map((칸) => (숫자칸.test(칸) ? ':n' : uuid칸.test(칸) || 긴16진.test(칸) ? ':id' : 칸));
  return { host: u.host.toLowerCase(), path: 칸들.join('/') || '/' };
}

const 두칸끝 = new Set(['co', 'or', 'ne', 'go', 'ac', 're', 'com', 'net', 'org', 'gov', 'edu']);

// ponytail: 공개 접미사 목록 없이 끝 두 칸(`co.kr` 꼴이면 세 칸)으로 사이트를 잰다. 틀리는 접미사가 나오면 목록을 들인다
function 사이트(hostname: string): string {
  const h = hostname.toLowerCase().replace(/\.$/, '');
  if (!h.includes('.') || /^[\d.]+$/.test(h) || h.includes(':') || h.startsWith('[')) return h;
  const 칸 = h.split('.');
  const 끝 = 칸.length >= 3 && 칸.at(-1)!.length === 2 && 두칸끝.has(칸.at(-2)!) ? 3 : 2;
  return 칸.slice(-끝).join('.');
}

/** 같은 사이트인가 — 포트 · 하위 도메인은 안 본다(api.example.com 은 www.example.com 과 같은 사이트). 다른 도메인(광고 · 분석)은 지도에 안 든다 */
export function 같은사이트인가(host: string, 기준주소: string): boolean {
  try {
    return 사이트(new URL(`http://${host}`).hostname) === 사이트(new URL(기준주소).hostname);
  } catch {
    return false;
  }
}

/** 그 API 의 마지막 2xx 코드. E2E 미룬 삭제가 그 코드로 답한다 (도메인/시나리오 §3.7 결정 12). 4xx · 5xx 는 흉내 내면 안 돼서 안 남긴다 */
type 성공코드 = { okStatus?: number };

/** 브라우저 쪽 API(fetch · xhr)와 테스트 코드의 요청 도구(api)만, 같은 사이트만, (방식, 호스트, 틀)마다 한 줄 · 부른 단계 · 마지막 성공 코드를 모아 */
export function 지도줄들(
  줄들: readonly { method: string; url: string; resourceType?: string; seq?: number | null; status?: number | null }[],
  기준주소: string,
): (API줄 & 성공코드 & { steps: number[] })[] {
  const 모음 = new Map<string, API줄 & 성공코드 & { steps: Set<number> }>();
  for (const 줄 of 줄들) {
    if (줄.resourceType !== undefined && !['fetch', 'xhr', 'api'].includes(줄.resourceType)) continue;
    const 틀 = API틀(줄.url);
    const method = 줄.method.toUpperCase();
    if (틀 === null || !/^[A-Z]{1,10}$/.test(method) || !같은사이트인가(틀.host, 기준주소)) continue;
    const 키 = `${method} ${틀.host}${틀.path}`;
    const 칸 = 모음.get(키) ?? (모음.size < 지도상한 ? { method, ...틀, steps: new Set<number>() } : undefined);
    if (칸 === undefined) continue;
    if (typeof 줄.seq === 'number') 칸.steps.add(줄.seq);
    // 테스트 코드의 요청 도구(api)만 배운다 — 브라우저 쪽은 케이스가 route 로 꾸민 응답일 수 있고, 미룬 삭제도 요청 도구 쪽뿐이다
    if (줄.resourceType === 'api' && typeof 줄.status === 'number' && 줄.status >= 200 && 줄.status <= 299) 칸.okStatus = 줄.status;
    모음.set(키, 칸);
  }
  return [...모음.values()].map((x) => ({ ...x, steps: [...x.steps].sort((a, b) => a - b) }));
}

// 넣은 API 의 번호. 같은 키는 마지막 본 때와 성공 코드만 바꾼다 — 성공 코드가 없는 줄(화면 줄 · 실패만 본 줄)은 앞 코드를 둔다
async function API넣기(손: PoolClient, 서비스: number, 줄들: readonly (API줄 & 성공코드)[]): Promise<Map<string, number>> {
  if (줄들.length === 0) return new Map();
  const r = await 손.query<{ id: string; method: string; host: string; path: string }>(
    `INSERT INTO service_api (service_id, method, host, path, ok_status)
     SELECT DISTINCT $1::bigint, x.method, x.host, x.path, x.ok FROM json_to_recordset($2) AS x(method text, host text, path text, ok int)
      -- 늘 같은 차례로 잠근다 — 화면 기록 통로와 trace 적재가 같은 API 둘을 반대 차례로 넣다 서로 기다리지 않게
      ORDER BY 2, 3, 4
     ON CONFLICT (service_id, method, host, path) DO UPDATE SET last_seen = now(), ok_status = COALESCE(EXCLUDED.ok_status, service_api.ok_status)
     RETURNING id, method, host, path`,
    [서비스, JSON.stringify(줄들.map(({ method, host, path, okStatus }) => ({ method, host, path, ok: okStatus ?? null })))],
  );
  return new Map(r.rows.map((x) => [`${x.method} ${x.host}${x.path}`, Number(x.id)]));
}

/**
 * 케이스 줄 — 그 케이스의 더 새 실행을 이미 풀었으면 낡은 것이라 안 넣는다(새 실행이 API 를 하나도 안 불러 줄이 없어도 — 푼 상태 줄로 본다).
 * 더 옛 실행 줄은 지우고, 같은 실행(기기 · 회차가 다른 항목)은 합친다. 같은 항목을 다시 풀어도 줄이 안 는다
 */
export async function 케이스지도를넣는다(손: PoolClient, 서비스: number, tcId: string, runId: number, 줄들: readonly (API줄 & 성공코드 & { steps: number[] })[]): Promise<void> {
  const 새것 = await 손.query(
    `SELECT 1 FROM run_item i JOIN run_trace t ON t.history_id = i.history_id
      WHERE i.tc_id = $1 AND i.run_id > $2 AND t.status = 'DONE' LIMIT 1`,
    [tcId, runId],
  );
  if (새것.rowCount !== 0) return;
  await 손.query('DELETE FROM service_api_use WHERE service_id = $1 AND tc_id = $2 AND run_id < $3', [서비스, tcId, runId]);
  const 번호들 = await API넣기(손, 서비스, 줄들);
  const 쓴것 = 줄들.map((x) => ({ api: 번호들.get(`${x.method} ${x.host}${x.path}`), steps: x.steps }));
  await 손.query(
    `INSERT INTO service_api_use (api_id, service_id, tc_id, run_id, steps)
     SELECT x.api, $1, $2, $3, ARRAY(SELECT json_array_elements_text(x.steps)::int) FROM json_to_recordset($4) AS x(api bigint, steps json)
     ON CONFLICT (api_id, tc_id) WHERE tc_id IS NOT NULL DO UPDATE
       SET run_id = EXCLUDED.run_id, seen_at = now(),
           steps = ARRAY(SELECT DISTINCT s FROM unnest(service_api_use.steps || EXCLUDED.steps) AS s ORDER BY s)`,
    [서비스, tcId, runId, JSON.stringify(쓴것)],
  );
}

/** 화면 줄 — 그 화면(대상 서버 · 상태 · 같은 틀)의 줄을 보낸 것으로 갈아 끼운다. 화면 기록을 넣은 같은 묶음 안에서 부른다(화면 기록 열쇠를 가리킨다) */
export async function 화면지도를넣는다(손: PoolClient, 서비스: number, 화면: { env: string; state: string; url: string }, 줄들: readonly API줄[]): Promise<void> {
  await 손.query('DELETE FROM service_api_use WHERE service_id = $1 AND env = $2 AND state = $3 AND screen_url = $4', [서비스, 화면.env, 화면.state, 화면.url]);
  const 번호들 = await API넣기(손, 서비스, 줄들);
  await 손.query(
    `INSERT INTO service_api_use (api_id, service_id, env, state, screen_url)
     SELECT DISTINCT a, $1::bigint, $2, $3, $4 FROM unnest($5::bigint[]) AS a ON CONFLICT DO NOTHING`,
    [서비스, 화면.env, 화면.state, 화면.url, [...번호들.values()]],
  );
}

export interface 지도API extends API줄 {
  firstSeen: string;
  lastSeen: string;
  cases: { tcId: string; steps: number[] }[];
  screens: { env: string; state: string; url: string }[];
}

/** 그 서비스의 지도 — 호스트 · 틀 · 방식 차례. 케이스 줄이 빈 API 가 「케이스가 안 거친 API」다. 지웠거나 번호를 바꾼 케이스(카탈로그에 활성으로 없는 것)의 줄은 안 싣는다 */
export async function 지도를읽는다(서비스: number): Promise<{ apis: 지도API[] }> {
  const p = await db();
  const r = await p.query<{
    method: string; host: string; path: string; first_seen: Date; last_seen: Date;
    cases: { tcId: string; steps: number[] }[]; screens: { env: string; state: string; url: string }[];
  }>(
    `SELECT a.method, a.host, a.path, a.first_seen, a.last_seen,
            COALESCE(jsonb_agg(jsonb_build_object('tcId', u.tc_id, 'steps', to_jsonb(u.steps)) ORDER BY u.tc_id) FILTER (WHERE u.tc_id IS NOT NULL), '[]') AS cases,
            COALESCE(jsonb_agg(jsonb_build_object('env', u.env, 'state', u.state, 'url', u.screen_url) ORDER BY u.env, u.state, u.screen_url)
                       FILTER (WHERE u.tc_id IS NULL AND u.id IS NOT NULL), '[]') AS screens
       FROM service_api a
       LEFT JOIN service_api_use u ON u.api_id = a.id
             AND (u.tc_id IS NULL OR EXISTS (SELECT 1 FROM test_case c WHERE c.tc_id = u.tc_id AND c.is_active))
      WHERE a.service_id = $1
      GROUP BY a.id ORDER BY a.host, a.path, a.method`,
    [서비스],
  );
  return {
    apis: r.rows.map((x) => ({
      method: x.method, host: x.host, path: x.path, firstSeen: x.first_seen.toISOString(), lastSeen: x.last_seen.toISOString(), cases: x.cases, screens: x.screens,
    })),
  };
}

/**
 * 그 서비스에서 성공 코드를 본 DELETE — 시나리오 실행 요청에 실어 러너가 미룬 삭제에 그 코드로 답한다 (도메인/시나리오 §3.7 결정 12).
 * 러너 입구 상한(호스트 255자 · 주소 2000자 · 1000줄)을 넘는 줄은 뺀다 — 한 줄 때문에 그 서비스의 시나리오가 다 400 이 되지 않게.
 * 트랜잭션을 쥔 채 부르면 그 손을 넘긴다 — pool 에서 또 꺼내면 교착한다
 */
export async function 삭제코드를읽는다(서비스: number, 손?: Pick<PoolClient, 'query'>): Promise<ScenarioDeleteStatus[]> {
  const p = 손 ?? (await db());
  const r = await p.query<{ host: string; path: string; ok_status: number }>(
    `SELECT host, path, ok_status FROM service_api
      WHERE service_id = $1 AND method = 'DELETE' AND ok_status IS NOT NULL AND length(host) <= 255 AND length(path) <= 2000
      ORDER BY last_seen DESC LIMIT 1000`,
    [서비스],
  );
  return r.rows.map((x) => ({ host: x.host, path: x.path, status: x.ok_status }));
}
