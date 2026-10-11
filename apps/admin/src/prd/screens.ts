// 화면 기록 저장본 — 작성 에이전트가 훑은 화면마다의 기록과 화면 연결을 DB 에 둔다 (도메인/작성 §3.6 「바뀐 화면만 다시 훑는다」 · §7 「표준 기획서 통로」)
// 맞추는 열쇠는 상태 + 같은 틀(url 칸)이다 — 번호만 다른 주소를 한 화면으로 봐야 게시판 글처럼 매번 다른 글이 열리는 화면도 다시 안 훑는다

import { db, 한묶음 } from '../settings/store.js';

const 상태들 = ['로그아웃', '로그인'] as const;
type 상태 = (typeof 상태들)[number];

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
type 오류 = { error: 'BAD_SCREEN'; detail: string };

// 기록 200KB 는 디스크 저장본 때의 상한 그대로다. 본 화면 목록은 크롤 100장 상한보다 넉넉히
const 상한 = { url: 2_000, name: 500, record: 200_000, links: 1_000, via: 500, seen: 5_000 } as const;
const 지문꼴 = /^[0-9a-f]{1,64}$/;
const 시각꼴 = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}:\d{2}))?$/;

const 틀림 = (detail: string): 오류 => ({ error: 'BAD_SCREEN', detail });
const 칸들 = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null ? (v as Record<string, unknown>) : {});
const 글인가 = (v: unknown, 최대: number, 빈것 = false): v is string =>
  typeof v === 'string' && v.length <= 최대 && (빈것 || v.trim() !== '');
const 상태인가 = (v: unknown): v is 상태 => 상태들.includes(v as 상태);

/** PUT 본문 — 화면 하나와 그 화면에서 나간 연결 */
export function 화면검사(몸: unknown): { 화면: 화면; links: 링크[] } | 오류 {
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
  return { 화면: { state: b.state, url: b.url, name: b.name, textFp: b.textFp, structFp: b.structFp, record: b.record, crawledAt: b.crawledAt }, links };
}

/** done 본문 — 이번에 본 화면(재사용 포함)과 다 본 상태. 다 본 상태가 비면 아무것도 안 지운다. name 은 찾은 화면 이름이다 */
export function 다봄검사(몸: unknown): { seen: { state: 상태; url: string; name: string }[]; complete: 상태[] } | 오류 {
  const b = 칸들(몸);
  if (!Array.isArray(b.complete) || !b.complete.every(상태인가)) return 틀림('complete');
  if (!Array.isArray(b.seen) || b.seen.length > 상한.seen) return 틀림('seen');
  const seen: { state: 상태; url: string; name: string }[] = [];
  for (const [i, s] of b.seen.entries()) {
    const x = 칸들(s);
    if (!상태인가(x.state) || !글인가(x.url, 상한.url)) return 틀림(`seen.${i}`);
    if (x.name !== undefined && !글인가(x.name, 상한.name, true)) return 틀림(`seen.${i}`);
    seen.push({ state: x.state, url: x.url, name: typeof x.name === 'string' ? x.name : '' });
  }
  return { seen, complete: [...new Set(b.complete)] };
}

/** 그 서비스의 화면 기록 전부와 화면 연결 — 에이전트가 자식 앞 `kept/` 를 만든다 */
export async function 화면들(서비스: number): Promise<{ screens: 화면[]; links: ({ state: 상태; fromUrl: string } & 링크)[] }> {
  const p = await db();
  const [s, l] = await Promise.all([
    p.query<{ state: 상태; url: string; name: string; text_fp: string; struct_fp: string; record: string; crawled_at: Date }>(
      'SELECT state, url, name, text_fp, struct_fp, record, crawled_at FROM screen_record WHERE service_id = $1 ORDER BY state, url',
      [서비스],
    ),
    p.query<{ state: 상태; from_url: string; to_url: string; via: string }>(
      'SELECT state, from_url, to_url, via FROM screen_link WHERE service_id = $1 ORDER BY state, from_url, to_url, via',
      [서비스],
    ),
  ]);
  return {
    screens: s.rows.map((r) => ({
      state: r.state, url: r.url, name: r.name, textFp: r.text_fp, structFp: r.struct_fp, record: r.record, crawledAt: r.crawled_at.toISOString(),
    })),
    links: l.rows.map((r) => ({ state: r.state, fromUrl: r.from_url, toUrl: r.to_url, via: r.via })),
  };
}

/** 같은 키(상태 + 같은 틀)는 바꾸고, 그 화면에서 나간 연결은 보낸 것으로 갈아 끼운다 */
export async function 화면넣기(서비스: number, x: 화면, links: 링크[]): Promise<void> {
  await 한묶음(async (손) => {
    await 손.query(
      `INSERT INTO screen_record (service_id, state, url, name, text_fp, struct_fp, record, crawled_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (service_id, state, url) DO UPDATE
         SET name = EXCLUDED.name, text_fp = EXCLUDED.text_fp, struct_fp = EXCLUDED.struct_fp,
             record = EXCLUDED.record, crawled_at = EXCLUDED.crawled_at`,
      [서비스, x.state, x.url, x.name, x.textFp, x.structFp, x.record, x.crawledAt],
    );
    await 손.query('DELETE FROM screen_link WHERE service_id = $1 AND state = $2 AND from_url = $3', [서비스, x.state, x.url]);
    await 손.query(
      `INSERT INTO screen_link (service_id, state, from_url, to_url, via)
       SELECT $1, $2, $3, t, v FROM unnest($4::text[], $5::text[]) AS l(t, v)
       ON CONFLICT DO NOTHING`,
      [서비스, x.state, x.url, links.map((l) => l.toUrl), links.map((l) => l.via)],
    );
  });
}

/**
 * 본 화면을 찾은 화면(screen_found)에 넣고(같은 키는 이름만 바꾼다), 다 본 상태에서 이번에 못 본 화면의 기록 ·
 * 연결 · 찾은 화면을 지운다 — 지운 화면 기록 수.
 * 로그인 없이 돈 날은 로그아웃만 다 본 상태라 로그인 기록이 남는다 (§3.6 「바뀐 화면만 다시 훑는다」).
 * 찾은 화면 넣기는 다 본 상태가 비어도 한다 — 비면 지우기만 안 한다
 */
export async function 다봄(서비스: number, seen: { state: 상태; url: string; name: string }[], complete: 상태[]): Promise<number> {
  const 값 = [서비스, complete, seen.map((s) => s.state), seen.map((s) => s.url)];
  return 한묶음(async (손) => {
    await 손.query(
      // 같은 키가 두 번 오면 ON CONFLICT 가 한 행을 두 번 고치려다 통째로 실패한다 — 하나로 줄인다.
      // 빈 이름은 옛 이름을 지우지 않는다(이름 없이 보낸 done · 제목 없는 화면)
      `INSERT INTO screen_found (service_id, state, url, name)
       SELECT DISTINCT ON (s.state, s.url) $1::bigint, s.state, s.url, s.name
         FROM unnest($2::text[], $3::text[], $4::text[]) AS s(state, url, name)
        ORDER BY s.state, s.url, s.name DESC
       ON CONFLICT (service_id, state, url) DO UPDATE SET name = COALESCE(NULLIF(EXCLUDED.name, ''), screen_found.name)`,
      [서비스, seen.map((s) => s.state), seen.map((s) => s.url), seen.map((s) => s.name)],
    );
    if (complete.length === 0) return 0;
    await 손.query(
      `DELETE FROM screen_found f WHERE f.service_id = $1 AND f.state = ANY($2::text[])
          AND NOT EXISTS (SELECT 1 FROM unnest($3::text[], $4::text[]) AS s(state, url) WHERE s.state = f.state AND s.url = f.url)`,
      값,
    );
    await 손.query(
      `DELETE FROM screen_link l WHERE l.service_id = $1 AND l.state = ANY($2::text[])
          AND NOT EXISTS (SELECT 1 FROM unnest($3::text[], $4::text[]) AS s(state, url) WHERE s.state = l.state AND s.url = l.from_url)`,
      값,
    );
    const r = await 손.query(
      `DELETE FROM screen_record r WHERE r.service_id = $1 AND r.state = ANY($2::text[])
          AND NOT EXISTS (SELECT 1 FROM unnest($3::text[], $4::text[]) AS s(state, url) WHERE s.state = r.state AND s.url = r.url)`,
      값,
    );
    return r.rowCount ?? 0;
  });
}
