// 보류 케이스에 사람이 넣은 값(held_input) — 모양 검사 · 남은 수 · 새 실행으로 옮기기 · 저장 (SPEC 도메인/작성 §3.6 「★ 보류 케이스」)

import { db } from './store.js';

export interface 칸 {
  side: 'params' | 'expected';
  key: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'enum';
  options?: string[];
}

/** 끝내기 result.held[] 한 줄. fields 는 에이전트 스크립트가 코드에서 계산한다 */
export interface 보류 {
  tcId: string;
  file: string;
  kind: 'UNDECIDABLE' | 'ON_HOLD';
  reason: string;
  fields: 칸[];
}

export type 값 = string | number | boolean;
export type 값들 = Record<string, 값>;
export type 넣을것 = { params?: 값들; expected?: 값들 } | { removed: true };
export type 입력한것 = { params?: 값들; expected?: 값들; removed?: true; by: string; at: string };
export type 보류입력 = Record<string, 입력한것>;

const 쪽들 = ['params', 'expected'] as const;

function 값맞나(칸: 칸, v: unknown): boolean {
  switch (칸.type) {
    case 'string':
      return typeof v === 'string';
    case 'number':
      return typeof v === 'number' && Number.isFinite(v);
    case 'boolean':
      return typeof v === 'boolean';
    case 'enum':
      return typeof v === 'string' && (칸.options ?? []).includes(v);
  }
}

function 객체인가(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * 부르는 쪽이 보낸 입력이 그 보류 케이스의 칸과 맞는가. 맞으면 입력, 아니면 까닭 글.
 * 비밀값 칸은 fields 에 없으므로 모르는 칸으로 걸린다 — 화면에서 비밀값을 받지 않는다
 */
export function 입력검사(보류: 보류, 입력: unknown): 넣을것 | string {
  if (!객체인가(입력)) return '입력이 객체가 아니다';
  const 키들 = Object.keys(입력);
  if ('removed' in 입력) {
    if (입력.removed !== true || 키들.length !== 1) return 'removed 는 true 하나만 온다';
    return { removed: true };
  }
  if (키들.length === 0) return '넣을 값이 없다';
  const 모르는 = 키들.find((k) => !(쪽들 as readonly string[]).includes(k));
  if (모르는 !== undefined) return `모르는 키: ${모르는}`;
  const 결과: { params?: 값들; expected?: 값들 } = {};
  for (const 쪽 of 쪽들) {
    const 묶음 = 입력[쪽];
    if (묶음 === undefined) continue;
    if (!객체인가(묶음)) return `${쪽} 가 객체가 아니다`;
    for (const [키, v] of Object.entries(묶음)) {
      const 맞는칸 = 보류.fields.find((f) => f.side === 쪽 && f.key === 키);
      if (맞는칸 === undefined) return `모르는 칸: ${쪽}.${키}`;
      if (!값맞나(맞는칸, v)) return `${쪽}.${키} 는 ${맞는칸.type} 이어야 한다`;
    }
    결과[쪽] = 묶음 as 값들;
  }
  return 결과;
}

function 끝났나(보류: 보류, 입력: 입력한것 | undefined): boolean {
  if (입력 === undefined) return false;
  if (입력.removed === true) return true;
  // fields 가 빈 케이스는 채울 수 없으니 제거해야 끝난다
  return 보류.fields.length > 0 && 보류.fields.every((f) => 입력[f.side]?.[f.key] !== undefined);
}

/** 남은 보류(heldOpen) — 채우지도 제거하지도 않은 케이스 수 */
export function 남은수(보류들: 보류[], 입력: 보류입력 | null): number {
  return 보류들.filter((h) => !끝났나(h, 입력?.[h.tcId])).length;
}

/**
 * 새 실행이 끝났을 때 앞 행의 입력 가운데 새 결과에도 맞는 것만 남긴다. 남는 것이 없으면 null(칸이 비면 NULL).
 * 옛 칸 이름이나 바뀐 타입의 값을 옮기면 반영 때 코드가 깨진다
 */
export function 입력옮기기(옛: 보류입력 | null, 새보류들: 보류[]): 보류입력 | null {
  const 새: 보류입력 = {};
  for (const h of 새보류들) {
    const e = 옛?.[h.tcId];
    if (e === undefined) continue;
    if (e.removed === true) {
      새[h.tcId] = { removed: true, by: e.by, at: e.at };
      continue;
    }
    const 남김: 입력한것 = { by: e.by, at: e.at };
    for (const 쪽 of 쪽들) {
      const 묶음 = Object.entries(e[쪽] ?? {}).filter(([키, v]) => {
        const f = h.fields.find((x) => x.side === 쪽 && x.key === 키);
        return f !== undefined && 값맞나(f, v);
      });
      if (묶음.length > 0) 남김[쪽] = Object.fromEntries(묶음);
    }
    if (남김.params !== undefined || 남김.expected !== undefined) 새[h.tcId] = 남김;
  }
  return Object.keys(새).length > 0 ? 새 : null;
}

/** 그 tcId 의 입력을 통째로 바꾼다. 누가 · 언제는 서버가 붙인다 — 부르는 쪽이 적지 않는다 */
export async function 입력넣기(id: number, tcId: string, 입력: 넣을것, by: string): Promise<void> {
  const 한것: 입력한것 = { ...입력, by, at: new Date().toISOString() };
  await (await db()).query(
    `UPDATE authoring_request
        SET held_input = COALESCE(held_input, '{}'::jsonb) || jsonb_build_object($2::text, $3::jsonb)
      WHERE id = $1`,
    [id, tcId, JSON.stringify(한것)],
  );
}

/** 그 tcId 의 입력을 되돌린다. 모두 비면 NULL */
export async function 입력지우기(id: number, tcId: string): Promise<void> {
  await (await db()).query(
    `UPDATE authoring_request SET held_input = NULLIF(held_input - $2::text, '{}'::jsonb) WHERE id = $1`,
    [id, tcId],
  );
}

export async function 입력읽기(id: number): Promise<보류입력> {
  const r = await (await db()).query<{ held_input: 보류입력 | null }>(
    'SELECT held_input FROM authoring_request WHERE id = $1',
    [id],
  );
  return r.rows[0]?.held_input ?? {};
}
