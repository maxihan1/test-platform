// GET /api/prd 의 held — 계정이 없어 테스트를 못 쓴 요구와 이어 작성 뿌리 (도메인/작성 §7 「표준 기획서 통로」 · §3.6 「★ 역할별 계정」)
// 비밀번호 원문은 싣지 않는다 — 역할 이름과 「넣었나」만 나간다

import { 막는까닭, 이어작성상태읽기 } from '../authoring/continue.js';
import { db } from '../authoring/store.js';
import { 등록역할들, 보류줄들 } from './heldQuery.js';

export interface 보류응답 {
  reqs: Record<string, string[]>;
  roles: { role: string; count: number; registered: boolean }[];
  continueFrom: number | null;
}

/** 뿌리 후보를 훑는 상한 — 서비스가 오래돼 대조 작성 뿌리가 많아도 한 번 읽을 때 질의가 늘지 않게 */
const 후보상한 = 20;

/**
 * 이어 작성 판정이 막지 않는 가장 최근 대조 작성 뿌리. 케이스 고치기(edits)는 표준 기획서를 안 읽어 뿌리가 못 된다.
 * 계정을 넣은 역할의 번호가 없으면 찾지 않는다 — 버튼이 눌러도 남은 번호가 없다
 */
async function 이어갈뿌리(서비스: number): Promise<number | null> {
  const r = await (await db()).query<{ id: string }>(
    `SELECT id FROM authoring_request
      WHERE service_id = $1 AND kind = 'AUTHOR' AND compare AND discarded_at IS NULL
        AND NOT (params ? 'prdApply') AND NOT (params ? 'edits')
      ORDER BY id DESC LIMIT ${String(후보상한)}`,
    [서비스],
  );
  for (const 줄 of r.rows) {
    const 번호 = Number(줄.id);
    if (막는까닭(await 이어작성상태읽기(번호)) === null) return 번호;
  }
  return null;
}

export async function 보류읽기(서비스: number): Promise<보류응답> {
  const 줄들 = await 보류줄들(서비스);
  if (줄들.length === 0) return { reqs: {}, roles: [], continueFrom: null };
  const 등록 = await 등록역할들(서비스);
  const reqs: Record<string, string[]> = {};
  const 건수 = new Map<string, number>();
  for (const { reqId, role } of 줄들) {
    (reqs[reqId] ??= []).push(role);
    건수.set(role, (건수.get(role) ?? 0) + 1);
  }
  const roles = [...건수].sort(([a], [b]) => a.localeCompare(b, 'ko')).map(([role, count]) => ({ role, count, registered: 등록.has(role) }));
  return { reqs, roles, continueFrom: roles.some((x) => x.registered) ? await 이어갈뿌리(서비스) : null };
}
