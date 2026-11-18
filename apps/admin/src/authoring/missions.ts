// 게임 시나리오 미션 목록 — 작성 에이전트가 올린 목록의 모양 검사 · 저장, 결정 목록이 고를 미션 · 제외 (도메인/게임 §3.10 결정 24 · 도메인/작성 §3.6 「★ 결정 목록」 · §7 「미션 목록 통로」)

import { createHash } from 'node:crypto';

import type { PoolClient } from 'pg';

import { db } from './store.js';

export interface 미션 {
  /** M01 · M02 … — 이어 작성이 고친 규칙의 미션만 고치고 번호는 둔다(tpx-cases game-scenario.md §2) */
  id: string;
  title: string;
  start: string;
  todo: string;
  success: string;
  /** 확인할 로그 한 줄 = 기획서 규칙 하나 */
  logs: { text: string; reqId: string }[];
}

/** 에이전트가 올리는 본문 — 미션 · 확인하는 미션이 없는 플레이 값 규칙 · 공식에 빈칸이 있어 값을 못 정한 규칙 */
export interface 미션올림 {
  items: 미션[];
  uncovered: { reqId: string; text: string }[];
  gaps: { reqId: string; note: string }[];
}

/** 저장 모양 — 올린 것에 사람이 [제외]한 미션 번호 */
export interface 미션칸 extends 미션올림 {
  skipped: string[];
}

const 상한 = { 미션: 200, 줄: 20, 규칙: 1000, 제목: 300, 글: 1000, 번호: 100 } as const;
const 미션번호 = /^M\d{2,3}$/;

const 글인가 = (x: unknown, 최대: number): x is string => typeof x === 'string' && x.trim() !== '' && x.length <= 최대;
const 객체 = (x: unknown): Record<string, unknown> | null => (typeof x === 'object' && x !== null && !Array.isArray(x) ? (x as Record<string, unknown>) : null);

/** PUT 본문 검사 — 틀린 자리를 detail 에 싣는다(에이전트가 PR 본문 줄로 남긴다) */
export function 미션검사(몸: unknown): 미션올림 | { error: 'INVALID_MISSIONS'; detail: string } {
  const 틀림 = (detail: string) => ({ error: 'INVALID_MISSIONS' as const, detail });
  const o = 객체(몸);
  if (o === null) return 틀림('body');
  const { items, uncovered, gaps } = o;
  if (!Array.isArray(items) || items.length > 상한.미션) return 틀림('items');
  if (!Array.isArray(uncovered) || uncovered.length > 상한.규칙) return 틀림('uncovered');
  if (!Array.isArray(gaps) || gaps.length > 상한.규칙) return 틀림('gaps');
  const 본번호 = new Set<string>();
  const 미션들: 미션[] = [];
  for (const [i, x] of items.entries()) {
    const m = 객체(x);
    if (m === null || typeof m.id !== 'string' || !미션번호.test(m.id) || 본번호.has(m.id)) return 틀림(`items[${String(i)}].id`);
    본번호.add(m.id);
    for (const 칸 of ['title', 'start', 'todo', 'success'] as const) if (!글인가(m[칸], 칸 === 'title' ? 상한.제목 : 상한.글)) return 틀림(`items[${String(i)}].${칸}`);
    if (!Array.isArray(m.logs) || m.logs.length === 0 || m.logs.length > 상한.줄) return 틀림(`items[${String(i)}].logs`);
    const logs: 미션['logs'] = [];
    for (const [j, y] of m.logs.entries()) {
      const l = 객체(y);
      if (l === null || !글인가(l.text, 상한.글) || !글인가(l.reqId, 상한.번호)) return 틀림(`items[${String(i)}].logs[${String(j)}]`);
      logs.push({ text: l.text, reqId: l.reqId });
    }
    미션들.push({ id: m.id, title: m.title as string, start: m.start as string, todo: m.todo as string, success: m.success as string, logs });
  }
  const 빠짐: 미션올림['uncovered'] = [];
  for (const [i, x] of uncovered.entries()) {
    const r = 객체(x);
    if (r === null || !글인가(r.reqId, 상한.번호) || !글인가(r.text, 상한.글)) return 틀림(`uncovered[${String(i)}]`);
    빠짐.push({ reqId: r.reqId, text: r.text });
  }
  const 빈칸: 미션올림['gaps'] = [];
  for (const [i, x] of gaps.entries()) {
    const r = 객체(x);
    if (r === null || !글인가(r.reqId, 상한.번호) || !글인가(r.note, 상한.글)) return 틀림(`gaps[${String(i)}]`);
    빈칸.push({ reqId: r.reqId, note: r.note });
  }
  return { items: 미션들, uncovered: 빠짐, gaps: 빈칸 };
}

/**
 * 미션 지문 — 번호와 양식 칸 전부. 쓴 미션인지 견줄 때 쓴다: 이어 작성이 규칙을 고쳐 미션 내용이 바뀌면 같은 번호라도 다시 고를 미션이다
 */
export const 미션지문 = (m: 미션): string =>
  createHash('sha256').update(JSON.stringify([m.id, m.title, m.start, m.todo, m.success, m.logs.map((l) => [l.text, l.reqId])])).digest('hex').slice(0, 16);

/** 결정 항목 열쇠의 지문 — 사람이 본 고를 미션과 진행 때 미션이 같은지 본다 */
export const 목록지문 = (ms: readonly 미션[]): string => createHash('sha256').update(ms.map(미션지문).join('|')).digest('hex').slice(0, 16);

/**
 * 올린 목록을 그 요청에 둔다. [제외]는 그 서비스가 바로 앞에 올린 목록에서 물려받는다 — 같은 번호 미션을 사람이 또 제외하지 않게
 */
export async function 미션넣기(요청: number, 서비스: number, 올림: 미션올림): Promise<void> {
  const 앞 = await 최신미션(서비스);
  const 번호들 = new Set(올림.items.map((m) => m.id));
  const skipped = (앞?.칸.skipped ?? []).filter((id) => 번호들.has(id));
  const 칸: 미션칸 = { ...올림, skipped };
  await (await db()).query('UPDATE authoring_request SET missions = $2 WHERE id = $1', [요청, JSON.stringify(칸)]);
}

/**
 * 그 서비스가 가장 늦게 올린 미션 목록 — 폐기 안 된 · 끝난 요청만. 늦게 올린 목록이 지금 기획서를 읽은 것이라 앞 목록을 갈음한다.
 * ponytail: 서비스마다 목록 하나다. 뿌리 여럿이 따로 미션을 올리는 일이 생기면 뿌리마다 최신으로 바꾼다
 */
export async function 최신미션(서비스: number, 손?: PoolClient): Promise<{ requestId: number; 칸: 미션칸 } | null> {
  const r = await (손 ?? (await db())).query<{ id: string; missions: 미션칸 }>(
    `SELECT id, missions FROM authoring_request
      WHERE service_id = $1 AND missions IS NOT NULL AND discarded_at IS NULL AND status = 'DONE'
      ORDER BY id DESC LIMIT 1`,
    [서비스],
  );
  const 행 = r.rows[0];
  return 행 === undefined ? null : { requestId: Number(행.id), 칸: { ...행.missions, skipped: 행.missions.skipped ?? [] } };
}

/** 이미 쓰러 보낸 미션의 지문 — 폐기 안 된 게임 시나리오 작성 요청(params.missions)이 실은 것 */
async function 쓴미션지문(서비스: number, 손?: PoolClient): Promise<Set<string>> {
  const r = await (손 ?? (await db())).query<{ items: unknown }>(
    `SELECT params->'missions'->'items' AS items FROM authoring_request
      WHERE service_id = $1 AND kind = 'AUTHOR' AND discarded_at IS NULL AND params ? 'missions'`,
    [서비스],
  );
  return new Set(r.rows.flatMap((x) => (Array.isArray(x.items) ? (x.items as 미션[]).map(미션지문) : [])));
}

export interface 고를미션 {
  requestId: number;
  /** 아직 안 쓴 · 제외 안 한 미션 */
  missions: 미션[];
  skipped: 미션[];
  uncovered: 미션올림['uncovered'];
  gaps: 미션올림['gaps'];
}

/** 결정 목록의 미션 항목 재료 — 고를 미션도 제외한 미션도 없으면 null */
export async function 고를미션읽기(서비스: number, 손?: PoolClient): Promise<고를미션 | null> {
  const 최신 = await 최신미션(서비스, 손);
  if (최신 === null) return null;
  const 쓴 = await 쓴미션지문(서비스, 손);
  const 제외 = new Set(최신.칸.skipped);
  const 남은 = 최신.칸.items.filter((m) => !쓴.has(미션지문(m)));
  const missions = 남은.filter((m) => !제외.has(m.id));
  const skipped = 남은.filter((m) => 제외.has(m.id));
  if (missions.length === 0 && skipped.length === 0) return null;
  return { requestId: 최신.requestId, missions, skipped, uncovered: 최신.칸.uncovered, gaps: 최신.칸.gaps };
}

/** [제외] · [되돌리기] — 지금 목록에 있는 미션만. 확인 창을 거쳐 적용 버튼 없이 곧바로 바꾼다(제외한 화면과 같다) */
export async function 미션제외바꾸기(서비스: number, 요청: number, id: string, skip: boolean): Promise<'OK' | 'NOT_FOUND'> {
  const r = await (await db()).query(
    `UPDATE authoring_request
        SET missions = jsonb_set(missions, '{skipped}',
          (SELECT COALESCE(jsonb_agg(DISTINCT s), '[]'::jsonb) FROM jsonb_array_elements_text(
             COALESCE(missions->'skipped', '[]'::jsonb) || CASE WHEN $4 THEN to_jsonb(ARRAY[$3::text]) ELSE '[]'::jsonb END) s
           WHERE $4 OR s <> $3))
      WHERE id = $1 AND service_id = $2 AND missions IS NOT NULL
        AND EXISTS (SELECT 1 FROM jsonb_array_elements(missions->'items') m WHERE m->>'id' = $3)`,
    [요청, 서비스, id, skip],
  );
  return (r.rowCount ?? 0) > 0 ? 'OK' : 'NOT_FOUND';
}
