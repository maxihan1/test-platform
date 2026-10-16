// 화면 기록 저장본 — 작성 에이전트가 훑은 화면마다의 기록과 화면 연결을 DB 에 둔다 (도메인/작성 §3.6 「바뀐 화면만 다시 훑는다」 · §7 「표준 기획서 통로」)
// 맞추는 열쇠는 대상 서버 + 상태 + 같은 틀(url 칸)이다 — 번호만 다른 주소를 한 화면으로 봐야 게시판 글처럼 매번 다른 글이 열리는 화면도 다시 안 훑는다.
// 대상 서버는 요청 행에서 읽는다 — 피처 플래그가 다른 qa 와 운영의 같은 화면이 서로 덮어쓰지 않게 (PRD-F9-29)

import { type 서비스판정, type 화면차이, 서비스가르기, 차이모양 } from '../../../../scripts/authoring-crawl-viewport.js';
import { type 상태, 상태인가 } from '../../../../scripts/authoring-screens-keep.js';
import { db, 한묶음 } from '../settings/store.js';
import { type API줄, 지도상한, 지도줄들, 화면지도를넣는다 } from './apiMap.js';

export interface 화면 {
  state: 상태;
  url: string;
  name: string;
  textFp: string;
  structFp: string;
  record: string;
  crawledAt: string;
}
type 링크 = { toUrl: string; via: string };
type 들은API = { method: string; url: string };
type 오류 = { error: 'BAD_SCREEN'; detail: string };
type 본화면 = { state: 상태; url: string; name: string; viewport: 화면차이 | null };

// 기록 200KB 는 디스크 저장본 때의 상한 그대로다. 본 화면 목록은 크롤 100장 상한보다 넉넉히
const 상한 = { url: 2_000, name: 500, record: 200_000, links: 1_000, via: 500, seen: 5_000 } as const;
const 지문꼴 = /^[0-9a-f]{1,64}$/;
const 시각꼴 = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2}))?$/;

const 틀림 = (detail: string): 오류 => ({ error: 'BAD_SCREEN', detail });
const 칸들 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {});
const 글인가 = (v: unknown, 최대: number, 빈것 = false): v is string =>
  typeof v === 'string' && v.length <= 최대 && (빈것 || v.trim() !== '');

/** PUT 본문 — 화면 하나와 그 화면에서 나간 연결 · 그 화면에서 들은 API(크롤러) */
export function 화면검사(몸: unknown): { 화면: 화면; links: 링크[]; apis: 들은API[] } | 오류 {
  const b = 칸들(몸);
  if (!상태인가(b.state)) return 틀림('state');
  if (!글인가(b.url, 상한.url)) return 틀림('url');
  if (!글인가(b.name, 상한.name, true)) return 틀림('name');
  if (typeof b.textFp !== 'string' || !지문꼴.test(b.textFp)) return 틀림('textFp');
  if (typeof b.structFp !== 'string' || !지문꼴.test(b.structFp)) return 틀림('structFp');
  if (!글인가(b.record, 상한.record)) return 틀림('record');
  if (typeof b.crawledAt !== 'string' || !시각꼴.test(b.crawledAt) || !Number.isFinite(Date.parse(b.crawledAt))) return 틀림('crawledAt');
  const 연결 = b.links ?? [];
  if (!Array.isArray(연결) || 연결.length > 상한.links) return 틀림('links');
  const links: 링크[] = [];
  for (const [i, l] of 연결.entries()) {
    const x = 칸들(l);
    if (!글인가(x.toUrl, 상한.url)) return 틀림(`links.${i}.toUrl`);
    if (!글인가(x.via, 상한.via)) return 틀림(`links.${i}.via`);
    links.push({ toUrl: x.toUrl, via: x.via });
  }
  const 들음 = b.apis ?? [];
  if (!Array.isArray(들음) || 들음.length > 지도상한) return 틀림('apis');
  const apis: 들은API[] = [];
  for (const [i, a] of 들음.entries()) {
    const x = 칸들(a);
    if (typeof x.method !== 'string' || !/^[A-Za-z]{1,10}$/.test(x.method)) return 틀림(`apis.${i}.method`);
    if (!글인가(x.url, 상한.url)) return 틀림(`apis.${i}.url`);
    apis.push({ method: x.method, url: x.url });
  }
  return { 화면: { state: b.state, url: b.url, name: b.name, textFp: b.textFp, structFp: b.structFp, record: b.record, crawledAt: b.crawledAt }, links, apis };
}

/** done 본문 — 이번에 본 화면(재사용 포함)과 다 본 상태. 다 본 상태가 비면 아무것도 안 지운다. name 은 찾은 화면 이름, viewport 는 PC · 모바일 차이다(PRD-F10-07) */
export function 다봄검사(몸: unknown): { seen: 본화면[]; complete: 상태[] } | 오류 {
  const b = 칸들(몸);
  if (!Array.isArray(b.complete) || !b.complete.every(상태인가)) return 틀림('complete');
  if (!Array.isArray(b.seen) || b.seen.length > 상한.seen) return 틀림('seen');
  const seen: 본화면[] = [];
  for (const [i, s] of b.seen.entries()) {
    const x = 칸들(s);
    if (!상태인가(x.state) || !글인가(x.url, 상한.url)) return 틀림(`seen.${i}`);
    if (x.name !== undefined && !글인가(x.name, 상한.name, true)) return 틀림(`seen.${i}`);
    const viewport = x.viewport === undefined || x.viewport === null ? null : 차이모양(x.viewport);
    if (viewport === null && x.viewport !== undefined && x.viewport !== null) return 틀림(`seen.${i}.viewport`);
    seen.push({ state: x.state, url: x.url, name: typeof x.name === 'string' ? x.name : '', viewport });
  }
  return { seen, complete: [...new Set(b.complete)] };
}

/** 그 서비스 · 대상 서버의 화면 기록 전부와 화면 연결 — 에이전트가 자식 앞 `kept/` 를 만든다 */
export async function 화면들(서비스: number, env: string): Promise<{ screens: 화면[]; links: ({ state: 상태; fromUrl: string } & 링크)[] }> {
  const p = await db();
  const [s, l] = await Promise.all([
    p.query<{ state: 상태; url: string; name: string; text_fp: string; struct_fp: string; record: string; crawled_at: Date }>(
      'SELECT state, url, name, text_fp, struct_fp, record, crawled_at FROM screen_record WHERE service_id = $1 AND env = $2 ORDER BY state, url',
      [서비스, env],
    ),
    p.query<{ state: 상태; from_url: string; to_url: string; via: string }>(
      'SELECT state, from_url, to_url, via FROM screen_link WHERE service_id = $1 AND env = $2 ORDER BY state, from_url, to_url, via',
      [서비스, env],
    ),
  ]);
  return {
    screens: s.rows.map((r) => ({
      state: r.state, url: r.url, name: r.name, textFp: r.text_fp, structFp: r.struct_fp, record: r.record, crawledAt: r.crawled_at.toISOString(),
    })),
    links: l.rows.map((r) => ({ state: r.state, fromUrl: r.from_url, toUrl: r.to_url, via: r.via })),
  };
}

/**
 * 같은 키(대상 서버 + 상태 + 같은 틀)는 바꾸고, 그 화면에서 나간 연결 · 들은 API 는 보낸 것으로 갈아 끼운다.
 * API 는 그 대상 서버 주소와 같은 사이트만 지도에 든다 — 자식이 보낸 목록을 그대로 믿지 않는다 (도메인/작성 §3.6 「서비스 지도」)
 */
export async function 화면넣기(서비스: number, env: string, x: 화면, links: 링크[], apis: 들은API[] = []): Promise<void> {
  await 한묶음(async (손) => {
    await 손.query(
      `INSERT INTO screen_record (service_id, env, state, url, name, text_fp, struct_fp, record, crawled_at)
            VALUES ($1, $9, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (service_id, env, state, url) DO UPDATE
         SET name = EXCLUDED.name, text_fp = EXCLUDED.text_fp, struct_fp = EXCLUDED.struct_fp,
             record = EXCLUDED.record, crawled_at = EXCLUDED.crawled_at`,
      [서비스, x.state, x.url, x.name, x.textFp, x.structFp, x.record, x.crawledAt, env],
    );
    await 손.query('DELETE FROM screen_link WHERE service_id = $1 AND env = $4 AND state = $2 AND from_url = $3', [서비스, x.state, x.url, env]);
    await 손.query(
      `INSERT INTO screen_link (service_id, env, state, from_url, to_url, via)
       SELECT $1, $6, $2, $3, t, v FROM unnest($4::text[], $5::text[]) AS l(t, v)
       ON CONFLICT DO NOTHING`,
      [서비스, x.state, x.url, links.map((l) => l.toUrl), links.map((l) => l.via), env],
    );
    const 기준 = await 손.query<{ base_url: string }>('SELECT base_url FROM service_env WHERE service_id = $1 AND env = $2', [서비스, env]);
    const 줄들: API줄[] = 기준.rows[0] === undefined ? [] : 지도줄들(apis, 기준.rows[0].base_url);
    await 화면지도를넣는다(손, 서비스, { env, state: x.state, url: x.url }, 줄들);
  });
}

/**
 * 본 화면을 찾은 화면(screen_found)에 넣고(같은 키는 이름 · 차이만 바꾼다), 다 본 상태에서 이번에 못 본 화면의 기록 ·
 * 연결 · 찾은 화면을 지운다 — 지운 화면 기록 수와 서비스 판정. 넣기도 지우기도 그 대상 서버 몫만이다.
 * 로그인 없이 돈 날은 로그아웃만 다 본 상태라 로그인 기록이 남는다 (§3.6 「바뀐 화면만 다시 훑는다」).
 * 찾은 화면 넣기는 다 본 상태가 비어도 한다 — 비면 지우기만 안 한다.
 * 서비스 판정은 이번에 보낸 차이로 서버가 다시 가른다 — 자식이 적은 판정을 안 믿는다. 다 본 상태가 있을 때만 남긴다 — 도중에 멈춘 크롤의 몇 장으로
 * 다 본 판정을 덮지 않게(못 본 화면 지우기와 같은 문턱). 차이가 하나도 없으면(옛 크롤러 · 모바일 못 엶) 옛 판정을 둔다 (PRD-F10-07)
 */
export async function 다봄(서비스: number, env: string, seen: 본화면[], complete: 상태[]): Promise<{ deleted: number; viewport: 서비스판정 | null }> {
  const 값 = [서비스, complete, seen.map((s) => s.state), seen.map((s) => s.url), env];
  const 판정 = complete.length === 0 ? null : 서비스가르기(seen.flatMap((s) => (s.viewport === null ? [] : [s.viewport])));
  return 한묶음(async (손) => {
    await 손.query(
      // 같은 키가 두 번 오면 ON CONFLICT 가 한 행을 두 번 고치려다 통째로 실패한다 — 하나로 줄인다. 이름은 있는 쪽, 차이도 있는 쪽을 고른다.
      // 빈 이름 · 빈 차이는 옛 값을 지우지 않는다(이름 없이 보낸 done · 제목 없는 화면 · 이번에 모바일로 못 연 화면)
      `INSERT INTO screen_found (service_id, env, state, url, name, viewport)
       SELECT $1::bigint, $5, s.state, s.url, max(s.name), ((array_agg(s.viewport) FILTER (WHERE s.viewport IS NOT NULL))[1])::jsonb
         FROM unnest($2::text[], $3::text[], $4::text[], $6::text[]) AS s(state, url, name, viewport)
        GROUP BY s.state, s.url
       ON CONFLICT (service_id, env, state, url) DO UPDATE
         SET name = COALESCE(NULLIF(EXCLUDED.name, ''), screen_found.name), viewport = COALESCE(EXCLUDED.viewport, screen_found.viewport)`,
      [서비스, seen.map((s) => s.state), seen.map((s) => s.url), seen.map((s) => s.name), env, seen.map((s) => (s.viewport === null ? null : JSON.stringify(s.viewport)))],
    );
    if (판정 !== null) {
      await 손.query('UPDATE service_env SET viewport_kind = $3, viewport_judged_at = now() WHERE service_id = $1 AND env = $2', [서비스, env, 판정]);
    }
    if (complete.length === 0) return { deleted: 0, viewport: 판정 };
    await 손.query(
      `DELETE FROM screen_found f WHERE f.service_id = $1 AND f.env = $5 AND f.state = ANY($2::text[])
          AND NOT EXISTS (SELECT 1 FROM unnest($3::text[], $4::text[]) AS s(state, url) WHERE s.state = f.state AND s.url = f.url)`,
      값,
    );
    await 손.query(
      `DELETE FROM screen_link l WHERE l.service_id = $1 AND l.env = $5 AND l.state = ANY($2::text[])
          AND NOT EXISTS (SELECT 1 FROM unnest($3::text[], $4::text[]) AS s(state, url) WHERE s.state = l.state AND s.url = l.from_url)`,
      값,
    );
    const r = await 손.query(
      `DELETE FROM screen_record r WHERE r.service_id = $1 AND r.env = $5 AND r.state = ANY($2::text[])
          AND NOT EXISTS (SELECT 1 FROM unnest($3::text[], $4::text[]) AS s(state, url) WHERE s.state = r.state AND s.url = r.url)`,
      값,
    );
    return { deleted: r.rowCount ?? 0, viewport: 판정 };
  });
}

/** PC 와 모바일이 하나라도 달랐나 — 설정 화면은 다른 화면만 펼치고 같은 화면은 수만 보인다 */
export const 차이있나 = (v: 화면차이): boolean =>
  v.모바일주소 !== undefined || v.넘침 || !v.선언 || !v.구조같음 || v.PC만.length > 0 || v.모바일만.length > 0;

/**
 * 설정 「화면 크기」 구획의 화면별 차이 — 그 대상 서버의 찾은 화면 가운데 차이를 가진 것(PRD-F10-08).
 * 모바일로 못 연 화면(viewport NULL)은 판정에 안 들어가서 셈에서도 뺀다
 */
export async function 화면크기목록(
  서비스: number,
  env: string,
): Promise<{ items: { state: 상태; url: string; name: string; viewport: 화면차이 }[]; same: number }> {
  const r = await (await db()).query<{ state: 상태; url: string; name: string; viewport: 화면차이 }>(
    `SELECT state, url, name, viewport FROM screen_found
      WHERE service_id = $1 AND env = $2 AND viewport IS NOT NULL
      ORDER BY state COLLATE "C", url COLLATE "C"`,
    [서비스, env],
  );
  const items = r.rows.filter((x) => 차이있나(x.viewport));
  return { items, same: r.rows.length - items.length };
}
