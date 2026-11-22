// 게임 지도 — 작성 에이전트가 올리는 게임 요소(데이터 · 월드 · 상태 · 상태 바뀜 · 재화 흐름)와 AI 가 읽는 지도 글 (도메인/게임 §3.10 「게임에만 있는 지도 넷」 · §7 game-elements · game-map)
// 지도는 기대값 근거가 아니다 — 근거는 표준 기획서 항목뿐이다. 서버 값 · 대조 실행은 실행 결과(elementChecks)만 쓴다

import type { PrdItem } from '@platform/kit';

import { db } from '../settings/store.js';

export const 요소종류 = { DATA: '게임 데이터', WORLD: '월드', STATE: '상태', MOVE: '상태 바뀜', FLOW: '재화 흐름' } as const;
type 종류 = keyof typeof 요소종류;

export interface 게임요소 {
  kind: 종류;
  key: string;
  name: string;
  value: unknown;
  reqIds: string[];
}

// 한 번에 올리는 요소 · 지우는 열쇠 상한. 지도 넷을 합쳐도 화면 기록 seen(5,000)을 넘지 않는다
const 상한 = { 줄: 5_000, 열쇠: 200, 이름: 200, 값: 10_000, 근거: 50, 번호: 100 } as const;
// 열쇠는 「item:sword_short」 「move:성향 선량→보라」 꼴 — 앞머리 뒤에 무엇이든 온다
const 열쇠꼴 = /^[a-z_]+:\S/;

const 글인가 = (v: unknown, 최대: number): v is string => typeof v === 'string' && v.trim() !== '' && v.length <= 최대;
const 틀림 = (detail: string) => ({ error: 'BAD_ELEMENT', detail }) as const;

/** PUT 본문을 본다. 틀린 첫 자리를 detail 로 */
export function 요소검사(본문: unknown): { elements: 게임요소[]; remove: string[] } | { error: 'BAD_ELEMENT'; detail: string } {
  const b = (typeof 본문 === 'object' && 본문 !== null ? 본문 : {}) as Record<string, unknown>;
  if (!Array.isArray(b.elements) || b.elements.length > 상한.줄) return 틀림('elements');
  const remove = b.remove ?? [];
  if (!Array.isArray(remove) || remove.length > 상한.줄) return 틀림('remove');
  const 본열쇠 = new Set<string>();
  const elements: 게임요소[] = [];
  for (const [i, x] of (b.elements as unknown[]).entries()) {
    const e = (typeof x === 'object' && x !== null ? x : {}) as Record<string, unknown>;
    // in 은 toString 같은 물려받은 이름도 통과시켜 DB CHECK 가 500 을 낸다
    if (typeof e.kind !== 'string' || !Object.hasOwn(요소종류, e.kind)) return 틀림(`elements.${i}.kind`);
    // 한 본문에 같은 열쇠가 둘이면 어느 쪽을 뜻했는지 모른다
    if (!글인가(e.key, 상한.열쇠) || !열쇠꼴.test(e.key) || 본열쇠.has(e.key)) return 틀림(`elements.${i}.key`);
    if (!글인가(e.name, 상한.이름)) return 틀림(`elements.${i}.name`);
    if (e.value !== undefined && JSON.stringify(e.value).length > 상한.값) return 틀림(`elements.${i}.value`);
    const reqIds = e.reqIds ?? [];
    if (!Array.isArray(reqIds) || reqIds.length > 상한.근거 || !reqIds.every((r) => 글인가(r, 상한.번호))) return 틀림(`elements.${i}.reqIds`);
    본열쇠.add(e.key);
    elements.push({ kind: e.kind as 종류, key: e.key, name: e.name, value: e.value ?? null, reqIds: reqIds as string[] });
  }
  for (const [i, k] of remove.entries()) {
    // 넣으면서 지우는 열쇠는 뜻이 둘이다
    if (!글인가(k, 상한.열쇠) || 본열쇠.has(k)) return 틀림(`remove.${i}`);
  }
  return { elements, remove: remove as string[] };
}

/** 올린 열쇠만 넣거나 고치고 remove 는 지운다. 그 애플리케이션 몫을 통째로 바꾸지 않는다 — 반영은 고친 요구의 요소만 다시 올린다 */
export async function 요소넣기(서비스: number, elements: 게임요소[], remove: string[]): Promise<void> {
  const 손 = await (await db()).connect();
  try {
    await 손.query('BEGIN');
    await 손.query('DELETE FROM game_element WHERE service_id = $1 AND key = ANY($2::text[])', [서비스, remove]);
    // server_value · checked_run 은 그대로 둔다 — 실행 결과만 쓴다. 다시 올린 요소는 지금 판으로 만든 것이라 「기획서가 바뀜」을 비운다
    await 손.query(
      `INSERT INTO game_element (service_id, kind, key, name, value, req_ids)
       SELECT $1, x.kind, x.key, x.name, x.value, ARRAY(SELECT jsonb_array_elements_text(x.req_ids))
         FROM jsonb_to_recordset($2::jsonb) AS x(kind text, key text, name text, value jsonb, req_ids jsonb)
       ON CONFLICT (service_id, key) DO UPDATE
         SET kind = EXCLUDED.kind, name = EXCLUDED.name, value = EXCLUDED.value, req_ids = EXCLUDED.req_ids, prd_changed = '{}', updated_at = now()`,
      [서비스, JSON.stringify(elements.map((e) => ({ kind: e.kind, key: e.key, name: e.name, value: e.value, req_ids: e.reqIds })))],
    );
    await 손.query('COMMIT');
  } catch (err) {
    await 손.query('ROLLBACK');
    throw err;
  } finally {
    손.release();
  }
}

const 상태조각 = (열쇠: string): string[] => 열쇠.slice('state:'.length).split(',').map((x) => x.trim()).filter((x) => x !== '');

/**
 * 기획서 새 판이 게임 지도를 끌고 간다 — 판넣기와 같은 트랜잭션에서 돈다. 게임이 아닌 애플리케이션은 요소가 없어 아무 일도 없다.
 * 지운 요구에만 붙은 요소는 빼고(다른 요구에도 붙었으면 번호만 뗀다), 그 상태를 목표로 하는 조작 맵 행도 뺀다 — 목표가 없어진 길이다.
 * 문장이 바뀐 요구에 붙은 요소는 prd_changed 에 번호를 적는다 — 새 값은 AI 가 지금 판을 읽어야 알아서 서버가 고칠 수 없다. 다음 작성이 다시 올리면 비워진다
 */
export async function 기획서따라가기(손: { query: Awaited<ReturnType<typeof db>>['query'] }, 서비스: number, 앞: PrdItem[], 새: PrdItem[]): Promise<void> {
  const 새글 = new Map(새.map((x) => [x.reqId, x.text]));
  const 지운 = 앞.filter((x) => !새글.has(x.reqId)).map((x) => x.reqId);
  const 바뀐 = 앞.filter((x) => 새글.has(x.reqId) && 새글.get(x.reqId) !== x.text).map((x) => x.reqId);
  if (지운.length > 0) {
    const 뺀 = await 손.query<{ key: string }>(
      'DELETE FROM game_element WHERE service_id = $1 AND req_ids <@ $2::text[] AND req_ids && $2::text[] RETURNING key',
      [서비스, 지운],
    );
    await 손.query(
      `UPDATE game_element SET req_ids = ARRAY(SELECT r FROM unnest(req_ids) r WHERE r <> ALL($2::text[])),
              prd_changed = ARRAY(SELECT r FROM unnest(prd_changed) r WHERE r <> ALL($2::text[]))
        WHERE service_id = $1 AND req_ids && $2::text[]`,
      [서비스, 지운],
    );
    const 없는상태 = new Set(뺀.rows.filter((x) => x.key.startsWith('state:')).flatMap((x) => 상태조각(x.key)));
    if (없는상태.size > 0) {
      // 남은 상태 요소가 아직 가진 조각은 없어진 것이 아니다(겹친 상태 요소 하나만 빠진 경우)
      const 남은 = await 손.query<{ key: string }>(`SELECT key FROM game_element WHERE service_id = $1 AND key LIKE 'state:%'`, [서비스]);
      for (const x of 남은.rows) for (const c of 상태조각(x.key)) 없는상태.delete(c);
    }
    if (없는상태.size > 0) {
      const 행 = await 손.query<{ id: string; kind: string; status: string; from_key: string; to_key: string | null }>(
        `SELECT id, kind, status, from_key, to_key FROM game_route WHERE service_id = $1 AND (from_key LIKE 'state:%' OR to_key LIKE 'state:%')`,
        [서비스],
      );
      // 행의 목표 상태 — 진행 불가 행은 출발 칸, 상태 설정 행은 도착 칸에 목표 열쇠가 있다. 그 상태에서 출발하는 이동 · 로그 행은 목표가 아니라 두고, 조각이 다 없어진 행만 뺀다
      const 뺄행 = 행.rows
        .filter((x) => {
          const 목표 = x.status === 'BLOCKED' ? x.from_key : x.kind === 'SETUP' ? x.to_key : null;
          const 조각 = 목표?.startsWith('state:') === true ? 상태조각(목표) : [];
          return 조각.length > 0 && 조각.every((c) => 없는상태.has(c));
        })
        .map((x) => x.id);
      if (뺄행.length > 0) await 손.query('DELETE FROM game_route WHERE id = ANY($1::bigint[])', [뺄행]);
    }
  }
  if (바뀐.length > 0) {
    await 손.query(
      `UPDATE game_element
          SET prd_changed = ARRAY(SELECT DISTINCT r FROM unnest(prd_changed || ARRAY(SELECT q FROM unnest(req_ids) q WHERE q = ANY($2::text[]))) r ORDER BY r)
        WHERE service_id = $1 AND req_ids && $2::text[]`,
      [서비스, 바뀐],
    );
  }
}

/** AI 가 읽는 지도 글(api-map.txt 꼴). 종류마다 요소 한 줄 — 기획서 값 · 근거 요구 · 기획서가 바뀜 · 서버 값과 같은지 · 거친 케이스 */
export async function 지도글(서비스: number): Promise<string> {
  const r = await (await db()).query<{
    kind: 종류; key: string; name: string; value: unknown; req_ids: string[]; prd_changed: string[]; server_value: unknown; checked_run: string | null; same: boolean | null; cases: string[];
  }>(
    // jsonb 는 열쇠 차례를 정리해 두므로 = 로 같은지 본다
    `SELECT e.kind, e.key, e.name, e.value, e.req_ids, e.prd_changed, e.server_value, e.checked_run, e.value = e.server_value AS same,
            COALESCE(array_agg(c.tc_id ORDER BY c.tc_id) FILTER (WHERE c.tc_id IS NOT NULL), '{}') AS cases
       FROM game_element e
       LEFT JOIN game_element_case c ON c.service_id = e.service_id AND c.key = e.key
      WHERE e.service_id = $1
      GROUP BY e.service_id, e.key
      ORDER BY e.key`,
    [서비스],
  );
  const 줄 = (x: (typeof r.rows)[number]): string =>
    [
      `- ${x.key} · ${x.name}`,
      x.value === null ? null : `기획서 ${JSON.stringify(x.value)}`,
      x.req_ids.length === 0 ? null : `근거 ${x.req_ids.join(', ')}`,
      x.prd_changed.length === 0 ? null : `기획서가 바뀜(${x.prd_changed.join(', ')}) — 지금 판으로 다시 올린다`,
      // 실행 행을 지우면 checked_run 만 비고 서버 값은 남는다 — 서버 값으로 가른다. 기획서 값이 없으면 견줄 것이 없다
      x.server_value === null
        ? '서버 값 대조 전'
        : `서버 ${JSON.stringify(x.server_value)} ${x.same === null ? '비교할 기획서 값 없음' : x.same ? '같음' : '다름'}${x.checked_run === null ? '' : ` (실행 #${x.checked_run})`}`,
      x.cases.length === 0 ? '거친 케이스 없음' : `케이스 ${x.cases.join(', ')}`,
    ]
      .filter((v) => v !== null)
      .join(' · ');
  const 묶음 = (Object.keys(요소종류) as 종류[]).flatMap((k) => {
    const 들 = r.rows.filter((x) => x.kind === k);
    return 들.length === 0 ? [] : [`## ${요소종류[k]} (${k}) — ${String(들.length)}개`, ...들.map(줄), ''];
  });
  const 바뀜수 = r.rows.filter((x) => x.prd_changed.length > 0).length;
  const 머리 = `# 게임 지도 — 요소 ${String(r.rows.length)}개${바뀜수 === 0 ? '' : ` · 기획서가 바뀐 요소 ${String(바뀜수)}개`}. 기대값의 근거가 아니다 — 근거는 표준 기획서 항목뿐이다`;
  return [머리, '', ...묶음].join('\n').trimEnd() + '\n';
}

export async function 게임서비스인가(서비스: number): Promise<boolean> {
  const r = await (await db()).query<{ kind: string }>('SELECT kind FROM service WHERE id = $1', [서비스]);
  return r.rows[0]?.kind === 'GAME';
}
