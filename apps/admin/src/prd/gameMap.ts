// 게임 지도 — 작성 에이전트가 올리는 게임 요소(데이터 · 월드 · 상태 · 상태 바뀜 · 재화 흐름)와 플레이하며 배운 것, AI 가 읽는 지도 글 (도메인/게임 §3.10 「게임에만 있는 지도 넷」 · 「게임에 대해 배운 것」 · §7 game-elements · game-map)
// 지도는 기대값 근거가 아니다 — 근거는 표준 기획서 항목뿐이다. 서버 값 · 대조 실행은 실행 결과(elementChecks)만 쓴다

import type { PrdItem } from '@platform/kit';

import { db } from '../settings/store.js';
import { type 배운것, 기본종류인가, 기획서종류, 만든종류이름, 배운것틀림, 열쇠꼴, 요소종류 } from './gameKinds.js';

export interface 게임요소 {
  kind: string;
  key: string;
  name: string;
  // learned 를 실은 줄이 value · reqIds 를 안 실으면 지난 값을 지킨다 — 배운 것을 올리다 기획서 값을 지우지 않게
  value?: unknown;
  reqIds?: string[];
  // 안 실으면 지난 배운 것을 지키고 null 이면 지운다
  learned?: 배운것 | null;
}

/** 게임이 만든 종류 이름 → 지도에서 그 종류를 쓰는 줄의 열쇠 */
export type 만든종류 = ReadonlyMap<string, readonly string[]>;

// 한 번에 올리는 요소 · 지우는 열쇠 상한. 지도 넷을 합쳐도 화면 기록 seen(5,000)을 넘지 않는다
const 상한 = { 줄: 5_000, 열쇠: 200, 이름: 200, 값: 10_000, 근거: 50, 번호: 100, 만든종류: 20 } as const;

const 글인가 = (v: unknown, 최대: number): v is string => typeof v === 'string' && v.trim() !== '' && v.length <= 최대;
const 틀림 = (detail: string) => ({ error: 'BAD_ELEMENT', detail }) as const;

/** PUT 본문을 본다. 틀린 첫 자리를 detail 로. 종류는 기본이거나 그 게임 지도(만든)나 이 본문에 정의(`kind:` 줄)가 있는 것만 */
export function 요소검사(본문: unknown, 만든: 만든종류 = new Map()): { elements: 게임요소[]; remove: string[] } | { error: 'BAD_ELEMENT'; detail: string } {
  const b = (typeof 본문 === 'object' && 본문 !== null ? 본문 : {}) as Record<string, unknown>;
  if (!Array.isArray(b.elements) || b.elements.length > 상한.줄) return 틀림('elements');
  const remove = b.remove ?? [];
  if (!Array.isArray(remove) || remove.length > 상한.줄) return 틀림('remove');
  const 본열쇠 = new Set<string>();
  const elements: 게임요소[] = [];
  const 줄들 = (b.elements as unknown[]).map((x) => (typeof x === 'object' && x !== null ? x : {}) as Record<string, unknown>);
  const 정의줄 = 줄들.flatMap((e, i) => {
    const 이름 = e.kind === 'KIND' && typeof e.key === 'string' ? 만든종류이름(e.key) : null;
    return 이름 === null ? [] : [{ 이름, i, 지움: e.learned === null }];
  });
  const 정의됨 = new Set([...만든.keys(), ...정의줄.filter((x) => !x.지움).map((x) => x.이름)]);
  for (const [i, e] of 줄들.entries()) {
    if (typeof e.kind !== 'string' || !(기본종류인가(e.kind) || 정의됨.has(e.kind))) return 틀림(`elements.${i}.kind`);
    // 한 본문에 같은 열쇠가 둘이면 어느 쪽을 뜻했는지 모른다
    if (!글인가(e.key, 상한.열쇠) || !열쇠꼴.test(e.key) || 본열쇠.has(e.key)) return 틀림(`elements.${i}.key`);
    // 기획서에서 온 다섯만 앞머리가 자유롭다 — 그 밖은 종류 이름이 곧 앞머리다
    if (e.kind === 'KIND' ? 만든종류이름(e.key) === null : !기획서종류.has(e.kind) && !e.key.startsWith(`${e.kind.toLowerCase()}:`)) return 틀림(`elements.${i}.key`);
    if (!글인가(e.name, 상한.이름)) return 틀림(`elements.${i}.name`);
    if (e.value !== undefined && JSON.stringify(e.value).length > 상한.값) return 틀림(`elements.${i}.value`);
    const reqIds = e.reqIds ?? [];
    if (!Array.isArray(reqIds) || reqIds.length > 상한.근거 || !reqIds.every((r) => 글인가(r, 상한.번호))) return 틀림(`elements.${i}.reqIds`);
    const 배움 = e.learned as 배운것 | null | undefined;
    // 종류 정의 줄은 배운 것이 곧 정의라 없으면 안 된다
    const 배움틀림 = 배움 === null || (배움 === undefined && e.kind !== 'KIND') ? null : 배운것틀림(배움, e.kind);
    if (배움틀림 !== null) return 틀림(`elements.${i}.learned${배움틀림 === '' ? '' : `.${배움틀림}`}`);
    // 게임이 만든 종류와 그 정의는 배운 것뿐이다 — 기획서 몫이 붙으면 배운 것을 지워도 줄이 남는다
    if (e.kind === 'KIND' || !기본종류인가(e.kind)) {
      if (e.value !== undefined) return 틀림(`elements.${i}.value`);
      if (reqIds.length > 0) return 틀림(`elements.${i}.reqIds`);
    }
    본열쇠.add(e.key);
    elements.push({
      kind: e.kind,
      key: e.key,
      name: e.name,
      ...(배움 === undefined || e.value !== undefined ? { value: e.value ?? null } : {}),
      ...(배움 === undefined || e.reqIds !== undefined ? { reqIds: reqIds as string[] } : {}),
      ...(배움 === undefined ? {} : { learned: 배움 }),
    });
  }
  // 정의를 지우면 그 종류를 쓰던 줄도 이 본문에서 옮기거나 지워야 한다
  for (const x of 정의줄.filter((d) => d.지움)) {
    if ((만든.get(x.이름) ?? []).some((k) => !본열쇠.has(k)) || elements.some((e) => e.kind === x.이름 && e.learned !== null)) return 틀림(`elements.${x.i}.learned`);
    정의됨.delete(x.이름);
  }
  const 새정의 = 정의줄.filter((x) => !x.지움 && !만든.has(x.이름)).at(-1);
  if (새정의 !== undefined && 정의됨.size > 상한.만든종류) return 틀림(`elements.${새정의.i}.kind`);
  for (const [i, k] of remove.entries()) {
    // 넣으면서 지우는 열쇠는 뜻이 둘이다
    if (!글인가(k, 상한.열쇠) || 본열쇠.has(k)) return 틀림(`remove.${i}`);
  }
  return { elements, remove: remove as string[] };
}

/** 그 애플리케이션 지도에 정의가 있는 게임이 만든 종류와 그 종류를 쓰는 줄 */
export async function 만든종류읽기(서비스: number): Promise<만든종류> {
  const r = await (await db()).query<{ name: string; keys: string[] }>(
    `SELECT substr(k.key, 6) AS name, COALESCE(array_agg(e.key) FILTER (WHERE e.key IS NOT NULL), '{}') AS keys
       FROM game_element k
       LEFT JOIN game_element e ON e.service_id = k.service_id AND e.kind = substr(k.key, 6)
      WHERE k.service_id = $1 AND k.kind = 'KIND' AND k.learned IS NOT NULL
      GROUP BY k.key`,
    [서비스],
  );
  return new Map(r.rows.map((x) => [x.name, x.keys]));
}

/**
 * 올린 열쇠만 넣거나 고친다. 그 애플리케이션 몫을 통째로 바꾸지 않는다 — 반영은 고친 요구의 요소만 다시 올린다.
 * remove 는 기획서 몫(값 · 근거)을 지운다 — 배운 것이 있는 줄은 그 몫만 비우고 남긴다. learned 가 null 이면 배운 것을 지우고, 기획서에서 온 다섯 밖의 줄은 기획서 몫도 없으면 줄을 뺀다
 * (다섯은 값도 근거도 없는 기획서 줄이 있어 remove 로만 뺀다). 배운 것만 올린 줄은 기획서에서 온 종류와 이름을 안 바꾼다 — 바꾸면 그 요소가 기획서 요소에서 빠진다
 */
export async function 요소넣기(서비스: number, elements: 게임요소[], remove: string[]): Promise<void> {
  const 손 = await (await db()).connect();
  try {
    await 손.query('BEGIN');
    await 손.query('DELETE FROM game_element WHERE service_id = $1 AND key = ANY($2::text[]) AND learned IS NULL', [서비스, remove]);
    await 손.query(`UPDATE game_element SET value = NULL, req_ids = '{}', prd_changed = '{}', updated_at = now() WHERE service_id = $1 AND key = ANY($2::text[])`, [서비스, remove]);
    // 지난 값을 읽어 되쓰는 줄이 있어 먼저 잠근다 — 그 사이 판 저장이 단 「기획서가 바뀜」을 덮지 않게
    await 손.query('SELECT key FROM game_element WHERE service_id = $1 AND key = ANY($2::text[]) ORDER BY key FOR UPDATE', [서비스, elements.map((e) => e.key)]);
    // server_value · checked_run 은 그대로 둔다 — 실행 결과만 쓴다. 기획서 몫을 다시 올린 요소는 지금 판으로 만든 것이라 「기획서가 바뀜」을 비운다
    await 손.query(
      `INSERT INTO game_element (service_id, kind, key, name, value, req_ids, learned, prd_changed)
       SELECT $1,
              CASE WHEN g.kind = ANY($3::text[]) AND x.keep_value AND x.keep_reqs THEN g.kind ELSE x.kind END,
              x.key,
              CASE WHEN g.kind = ANY($3::text[]) AND x.keep_value AND x.keep_reqs THEN g.name ELSE x.name END,
              CASE WHEN x.keep_value THEN g.value ELSE x.value END,
              CASE WHEN x.keep_reqs THEN COALESCE(g.req_ids, '{}') ELSE ARRAY(SELECT jsonb_array_elements_text(x.req_ids)) END,
              CASE WHEN x.keep_learned THEN g.learned ELSE x.learned END,
              CASE WHEN x.keep_value AND x.keep_reqs THEN COALESCE(g.prd_changed, '{}') ELSE '{}' END
         FROM jsonb_to_recordset($2::jsonb) AS x(kind text, key text, name text, value jsonb, req_ids jsonb, learned jsonb, keep_value boolean, keep_reqs boolean, keep_learned boolean)
         LEFT JOIN game_element g ON g.service_id = $1 AND g.key = x.key
       ON CONFLICT (service_id, key) DO UPDATE
         SET kind = EXCLUDED.kind, name = EXCLUDED.name, value = EXCLUDED.value, req_ids = EXCLUDED.req_ids,
             learned = EXCLUDED.learned, prd_changed = EXCLUDED.prd_changed, updated_at = now()`,
      [
        서비스,
        JSON.stringify(
          elements.map((e) => ({
            kind: e.kind, key: e.key, name: e.name, value: e.value ?? null, req_ids: e.reqIds ?? [], learned: e.learned ?? null,
            keep_value: e.value === undefined, keep_reqs: e.reqIds === undefined, keep_learned: e.learned === undefined,
          })),
        ),
        [...기획서종류],
      ],
    );
    await 손.query(
      `DELETE FROM game_element WHERE service_id = $1 AND key = ANY($2::text[]) AND kind <> ALL($3::text[]) AND learned IS NULL AND value IS NULL AND req_ids = '{}'`,
      [서비스, elements.filter((e) => e.learned === null).map((e) => e.key), [...기획서종류]],
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
 * 지운 요구에만 붙은 요소는 빼고(다른 요구에도 붙었으면 번호만, 배운 것이 있으면 기획서 값과 번호만 뗀다), 그 상태를 목표로 하는 조작 맵 행도 뺀다 — 목표가 없어진 길이다.
 * 문장이 바뀐 요구에 붙은 요소는 prd_changed 에 번호를 적는다 — 새 값은 AI 가 지금 판을 읽어야 알아서 서버가 고칠 수 없다. 다음 작성이 다시 올리면 비워진다
 */
export async function 기획서따라가기(손: { query: Awaited<ReturnType<typeof db>>['query'] }, 서비스: number, 앞: PrdItem[], 새: PrdItem[]): Promise<void> {
  const 새글 = new Map(새.map((x) => [x.reqId, x.text]));
  const 지운 = 앞.filter((x) => !새글.has(x.reqId)).map((x) => x.reqId);
  const 바뀐 = 앞.filter((x) => 새글.has(x.reqId) && 새글.get(x.reqId) !== x.text).map((x) => x.reqId);
  if (지운.length > 0) {
    const 뺀 = await 손.query<{ key: string }>(
      'DELETE FROM game_element WHERE service_id = $1 AND req_ids <@ $2::text[] AND req_ids && $2::text[] AND learned IS NULL RETURNING key',
      [서비스, 지운],
    );
    // 배운 것이 있는 줄은 남긴다 — 근거가 다 없어졌으니 기획서 값을 빼고 번호는 아래에서 뗀다
    const 비운 = await 손.query<{ key: string }>(
      'UPDATE game_element SET value = NULL WHERE service_id = $1 AND req_ids <@ $2::text[] AND req_ids && $2::text[] RETURNING key',
      [서비스, 지운],
    );
    await 손.query(
      `UPDATE game_element SET req_ids = ARRAY(SELECT r FROM unnest(req_ids) r WHERE r <> ALL($2::text[])),
              prd_changed = ARRAY(SELECT r FROM unnest(prd_changed) r WHERE r <> ALL($2::text[]))
        WHERE service_id = $1 AND req_ids && $2::text[]`,
      [서비스, 지운],
    );
    const 없는상태 = new Set([...뺀.rows, ...비운.rows].filter((x) => x.key.startsWith('state:')).flatMap((x) => 상태조각(x.key)));
    if (없는상태.size > 0) {
      // 남은 상태 요소가 아직 가진 조각은 없어진 것이 아니다(겹친 상태 요소 하나만 빠진 경우). 배운 것만 남은 줄은 기획서의 상태가 아니다
      const 남은 = await 손.query<{ key: string }>(
        `SELECT key FROM game_element WHERE service_id = $1 AND key LIKE 'state:%' AND (learned IS NULL OR value IS NOT NULL OR req_ids <> '{}')`,
        [서비스],
      );
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

/** AI 가 읽는 지도 글(api-map.txt 꼴). 종류마다 요소 한 줄 — 기획서 값 · 근거 요구 · 기획서가 바뀜 · 서버 값과 같은지 · 거친 케이스 · 배운 것(줄 끝까지 JSON) */
export async function 지도글(서비스: number): Promise<string> {
  const r = await (await db()).query<{
    kind: string; key: string; name: string; value: unknown; req_ids: string[]; prd_changed: string[]; server_value: unknown; checked_run: string | null; same: boolean | null; learned: 배운것 | null; cases: string[];
  }>(
    // jsonb 는 열쇠 차례를 정리해 두므로 = 로 같은지 본다
    `SELECT e.kind, e.key, e.name, e.value, e.req_ids, e.prd_changed, e.server_value, e.checked_run, e.value = e.server_value AS same, e.learned,
            COALESCE(array_agg(c.tc_id ORDER BY c.tc_id) FILTER (WHERE c.tc_id IS NOT NULL), '{}') AS cases
       FROM game_element e
       LEFT JOIN game_element_case c ON c.service_id = e.service_id AND c.key = e.key
      WHERE e.service_id = $1
      GROUP BY e.service_id, e.key
      ORDER BY e.key`,
    [서비스],
  );
  // 배운 것만 있는 줄은 케이스가 다룰 대상이 아니다
  const 다룰 = (x: (typeof r.rows)[number]): boolean => 기획서종류.has(x.kind) && (x.learned === null || x.value !== null || x.req_ids.length > 0);
  const 줄 = (x: (typeof r.rows)[number]): string =>
    [
      `- ${x.key} · ${x.name}`,
      x.value === null ? null : `기획서 ${JSON.stringify(x.value)}`,
      x.req_ids.length === 0 ? null : `근거 ${x.req_ids.join(', ')}`,
      x.prd_changed.length === 0 ? null : `기획서가 바뀜(${x.prd_changed.join(', ')}) — 지금 판으로 다시 올린다`,
      // 실행 행을 지우면 checked_run 만 비고 서버 값은 남는다 — 서버 값으로 가른다. 기획서 값이 없으면 견줄 것이 없다
      x.server_value === null
        ? (다룰(x) ? '서버 값 대조 전' : null)
        : `서버 ${JSON.stringify(x.server_value)} ${x.same === null ? '비교할 기획서 값 없음' : x.same ? '같음' : '다름'}${x.checked_run === null ? '' : ` (실행 #${x.checked_run})`}`,
      x.cases.length > 0 ? `케이스 ${x.cases.join(', ')}` : 다룰(x) ? '거친 케이스 없음' : null,
      // 늘 맨 끝에 둔다 — 찾기 명령이 줄 끝까지 JSON 으로 읽는다
      x.learned === null ? null : `배움 ${JSON.stringify(x.learned)}`,
    ]
      .filter((v) => v !== null)
      .join(' · ');
  // 정의가 없어진 종류의 줄도 찍는다 — 빼면 AI 글에서 조용히 사라진다
  const 만든이름 = new Map(r.rows.filter((x) => x.kind === 'KIND').map((x) => [x.key.slice('kind:'.length), x.name]));
  const 만든것 = [...new Set(r.rows.map((x) => x.kind))].filter((k) => !기본종류인가(k)).sort();
  const 묶음 = [...Object.keys(요소종류), ...만든것].flatMap((k) => {
    const 들 = r.rows.filter((x) => x.kind === k);
    const 이름 = 기본종류인가(k) ? 요소종류[k] : (만든이름.get(k) ?? k);
    return 들.length === 0 ? [] : [`## ${이름} (${k}) — ${String(들.length)}개`, ...들.map(줄), ''];
  });
  const 배운수 = r.rows.filter((x) => x.learned !== null).length;
  const 바뀜수 = r.rows.filter((x) => x.prd_changed.length > 0).length;
  const 머리 = `# 게임 지도 — 요소 ${String(r.rows.length)}개${바뀜수 === 0 ? '' : ` · 기획서가 바뀐 요소 ${String(바뀜수)}개`}${배운수 === 0 ? '' : ` · 배운 줄 ${String(배운수)}개`}. 기대값의 근거가 아니다 — 근거는 표준 기획서 항목뿐이다`;
  return [머리, '', ...묶음].join('\n').trimEnd() + '\n';
}

export async function 게임서비스인가(서비스: number): Promise<boolean> {
  const r = await (await db()).query<{ kind: string }>('SELECT kind FROM service WHERE id = $1', [서비스]);
  return r.rows[0]?.kind === 'GAME';
}
