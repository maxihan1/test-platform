// 보류 케이스에 사람이 넣은 값(held_input) — 모양 검사 · 남은 수 · 새 실행으로 옮기기 · 저장 (SPEC 도메인/작성 §3.6 「★ 보류 케이스」)

import { TCID } from '../catalog/rules.js';
import { 뿌리, 사슬식 } from './history.js';
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

const 보류키 = ['tcId', 'file', 'kind', 'reason', 'fields'];
const 칸키 = ['side', 'key', 'description', 'type', 'options'];

export function tcId인가(v: unknown): v is string {
  return typeof v === 'string' && TCID.test(v);
}

function 글인가(v: unknown): v is string {
  return typeof v === 'string' && v !== '';
}

function 칸모양(v: unknown): boolean {
  if (!객체인가(v) || Object.keys(v).some((k) => !칸키.includes(k))) return false;
  const { side, key, description, type, options } = v;
  if ((side !== 'params' && side !== 'expected') || !글인가(key) || typeof description !== 'string') return false;
  if (type === 'enum') return Array.isArray(options) && options.length > 0 && options.every((o) => typeof o === 'string');
  return (type === 'string' || type === 'number' || type === 'boolean') && options === undefined;
}

/**
 * 끝내기 result.held 의 모양. 맞으면 그대로, 아니면 null(→ 400 BAD_HELD).
 * 이 값이 화면의 입력 칸과 반영 때 코드에 적힐 칸을 정한다 — 느슨하면 틀린 칸에 값이 들어간다
 */
export function 보류모양검사(v: unknown): 보류[] | null {
  if (!Array.isArray(v)) return null;
  const 본것 = new Set<string>();
  for (const h of v) {
    if (!객체인가(h) || Object.keys(h).some((k) => !보류키.includes(k))) return null;
    if (!tcId인가(h.tcId) || 본것.has(h.tcId)) return null;
    본것.add(h.tcId);
    if (!글인가(h.file) || !글인가(h.reason) || (h.kind !== 'UNDECIDABLE' && h.kind !== 'ON_HOLD')) return null;
    if (!Array.isArray(h.fields) || !h.fields.every(칸모양)) return null;
  }
  return v as 보류[];
}

/** 행의 result.held — 끝내기에서 모양을 본 뒤 저장된 값이다 */
export function 보류들(result: unknown): 보류[] {
  const held = 객체인가(result) ? result.held : undefined;
  return Array.isArray(held) ? (held as 보류[]) : [];
}

/**
 * 새 실행이 DONE 으로 끝났을 때 같은 뿌리의 앞 DONE 실행에서 입력을 옮겨 온다.
 * 머지 행은 입력을 안 가진다. 멈춘 · 실패한 실행은 result.held 가 없어 입력도 못 받았으니 건너뛴다
 */
export async function 입력이어받기(id: number, 새보류들: 보류[]): Promise<void> {
  if (새보류들.length === 0) return;
  const 뿌리번호 = (await 뿌리(id)) ?? id;
  const pool = await db();
  const r = await pool.query<{ held_input: 보류입력 | null }>(
    `WITH RECURSIVE ${사슬식('id = $1')}
     SELECT a.held_input FROM 사슬 JOIN authoring_request a ON a.id = 사슬.id
      WHERE a.id < $2 AND a.kind <> 'MERGE' AND a.status = 'DONE'
      ORDER BY a.id DESC LIMIT 1`,
    [뿌리번호, id],
  );
  const 옮길것 = 입력옮기기(r.rows[0]?.held_input ?? null, 새보류들);
  if (옮길것 !== null) {
    await pool.query('UPDATE authoring_request SET held_input = $2 WHERE id = $1', [id, JSON.stringify(옮길것)]);
  }
}
