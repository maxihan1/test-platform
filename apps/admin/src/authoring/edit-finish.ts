// 케이스 고치기 반영이 끝난 뒤 — 바꾼 기대값 칸의 저장값 지우기 (SPEC 도메인/작성 §3.6 「★ 케이스 고치기」 저장값 · §7 끝내기)
// edit.ts 는 에이전트 스크립트도 읽어 가서 DB · 실행 쪽 의존을 거기 두지 않는다

import type { PoolClient } from 'pg';

import { 저장값칸지우기 } from '../execution/savedInput.js';
import { 행의고칠것 } from './edit.js';

export const 못받은까닭 = 'main 을 못 받아 와 저장값을 안 지웠다';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 반영(MERGE)이 DONE 으로 끝난 직후 부른다. 원본이 고치기 실행일 때만 움직인다.
 * `pulled` 가 참일 때만 지운다 — 러너가 옛 기본값으로 도는데 저장값까지 없으면 판정이 뒤집힌다.
 * 거짓이면 사람이 손으로 지우도록 반영 행에 사유를 남긴다. 없으면(pulled 를 안 싣는 옛 에이전트) 아무것도 안 한다
 */
export async function 반영뒤저장값(손: PoolClient, 머지: { id: number; sourceId: number | null }, pulled: unknown): Promise<void> {
  if (머지.sourceId === null) return;
  const r = await 손.query<{ params: unknown }>('SELECT params FROM authoring_request WHERE id = $1', [머지.sourceId]);
  const 고칠것 = 행의고칠것(r.rows[0]?.params);
  if (고칠것 === null) return;
  if (pulled === false) {
    await 손.query('UPDATE authoring_request SET error = $2 WHERE id = $1', [머지.id, 못받은까닭]);
    return;
  }
  if (pulled !== true) return;
  // 삭제 · 확정만 한 케이스는 저장값을 둔다 — 비활성 케이스는 실행 대상이 아니고, 확정은 기대값을 안 바꾼다
  for (const 고침 of 고칠것) {
    if (!isPlainObject(고침) || typeof 고침.tcId !== 'string' || !isPlainObject(고침.expected)) continue;
    await 저장값칸지우기(손, 고침.tcId, Object.keys(고침.expected));
  }
}
