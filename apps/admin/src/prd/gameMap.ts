// 게임 지도 — 작성 에이전트가 올리는 게임 요소(데이터 · 월드 · 상태 · 상태 바뀜 · 재화 흐름)와 AI 가 읽는 지도 글 (도메인/게임 §3.10 「게임에만 있는 지도 넷」 · §7 game-elements · game-map)
// 지도는 기대값 근거가 아니다 — 근거는 표준 기획서 항목뿐이다. 서버 값 · 대조 실행은 실행 결과(elementChecks)만 쓴다

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
    if (typeof e.kind !== 'string' || !(e.kind in 요소종류)) return 틀림(`elements.${i}.kind`);
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
    // server_value · checked_run 은 그대로 둔다 — 실행 결과만 쓴다
    await 손.query(
      `INSERT INTO game_element (service_id, kind, key, name, value, req_ids)
       SELECT $1, x.kind, x.key, x.name, x.value, ARRAY(SELECT jsonb_array_elements_text(x.req_ids))
         FROM jsonb_to_recordset($2::jsonb) AS x(kind text, key text, name text, value jsonb, req_ids jsonb)
       ON CONFLICT (service_id, key) DO UPDATE
         SET kind = EXCLUDED.kind, name = EXCLUDED.name, value = EXCLUDED.value, req_ids = EXCLUDED.req_ids, updated_at = now()`,
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

/** AI 가 읽는 지도 글(api-map.txt 꼴). 종류마다 요소 한 줄 — 기획서 값 · 근거 요구 · 서버 값과 같은지 · 거친 케이스 */
export async function 지도글(서비스: number): Promise<string> {
  const r = await (await db()).query<{
    kind: 종류; key: string; name: string; value: unknown; req_ids: string[]; server_value: unknown; checked_run: string | null; same: boolean | null; cases: string[];
  }>(
    // jsonb 는 열쇠 차례를 정리해 두므로 = 로 같은지 본다
    `SELECT e.kind, e.key, e.name, e.value, e.req_ids, e.server_value, e.checked_run, e.value = e.server_value AS same,
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
      x.checked_run === null ? '서버 값 대조 전' : `서버 ${JSON.stringify(x.server_value)} ${x.same === true ? '같음' : '다름'} (실행 #${x.checked_run})`,
      x.cases.length === 0 ? '거친 케이스 없음' : `케이스 ${x.cases.join(', ')}`,
    ]
      .filter((v) => v !== null)
      .join(' · ');
  const 묶음 = (Object.keys(요소종류) as 종류[]).flatMap((k) => {
    const 들 = r.rows.filter((x) => x.kind === k);
    return 들.length === 0 ? [] : [`## ${요소종류[k]} (${k}) — ${String(들.length)}개`, ...들.map(줄), ''];
  });
  return [`# 게임 지도 — 요소 ${String(r.rows.length)}개. 기대값의 근거가 아니다 — 근거는 표준 기획서 항목뿐이다`, '', ...묶음].join('\n').trimEnd() + '\n';
}

export async function 게임서비스인가(서비스: number): Promise<boolean> {
  const r = await (await db()).query<{ kind: string }>('SELECT kind FROM service WHERE id = $1', [서비스]);
  return r.rows[0]?.kind === 'GAME';
}
