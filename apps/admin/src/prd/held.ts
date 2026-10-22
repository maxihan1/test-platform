// GET /api/prd 의 held — 계정이 없어 테스트를 못 쓴 요구와 이어 작성 뿌리 (도메인/작성 §7 「표준 기획서 통로」 · §3.6 「★ 역할별 계정」)
// 비밀번호 원문은 싣지 않는다 — 역할 이름과 「넣었나」만 나간다

import { 기본역할 } from '@platform/kit/accounts';

import { 계정줄env, 막는까닭, 보류재료읽기, 이어작성상태읽기 } from '../authoring/continue.js';
import { 폰앱종류 } from '../authoring/reverse.js';
import { db } from '../authoring/store.js';
import { type 보류재료, 어디든등록, 줄에등록된보류있나 } from './heldQuery.js';

export interface 보류응답 {
  reqs: Record<string, string[]>;
  roles: { role: string; count: number; registered: boolean }[];
  continueFrom: number | null;
}

/** 뿌리 후보를 훑는 상한 — 서비스가 오래돼 대조 작성 뿌리가 많아도 한 번 읽을 때 질의가 늘지 않게 */
const 후보상한 = 20;

/**
 * 이어 작성 판정이 막지 않는 가장 최근 대조 작성 뿌리. 케이스 고치기(edits)는 표준 기획서를 안 읽어 뿌리가 못 된다.
 * 뿌리의 대상 서버 줄이 작성이 갈 수 있는 줄(운영 아님 · 일반 회원 계정)이고 그 줄에 계정을 넣은 역할의 보류가 있어야 한다 —
 * 아니면 버튼이 열렸다가 400 BAD_ENV 이거나 에이전트가 남은 번호를 못 센다. 서비스 전체 재료는 한 번만 읽어 넘긴다(2026-10-12 코드 검토)
 */
async function 이어갈뿌리(서비스: number, 재료: 보류재료): Promise<number | null> {
  // Android 앱 · 게임은 대조가 없어 정방향 뿌리도 앱 줄 계정으로 이어 간다 (§3.6 「★ 역할별 계정」 표 「이어 작성」 · 2026-10-22)
  const r = await (await db()).query<{ id: string; env: string | null; compare: boolean; kind: string }>(
    `SELECT a.id, a.env, a.compare, s.kind FROM authoring_request a JOIN service s ON s.id = a.service_id
      WHERE a.service_id = $1 AND a.kind = 'AUTHOR' AND (a.compare OR s.kind = ANY($2::text[])) AND a.discarded_at IS NULL
        AND NOT (a.params ? 'prdApply') AND NOT (a.params ? 'edits')
      ORDER BY a.id DESC LIMIT ${String(후보상한)}`,
    [서비스, 폰앱종류],
  );
  for (const 행 of r.rows) {
    const env = await 계정줄env(서비스, { 대조env: 행.compare ? 행.env : null, 뿌리env: 행.env }, 행.kind);
    const 줄 = { id: 행.id, env };
    if (!(재료.표.get(줄.env ?? '')?.has(기본역할) ?? false) || !줄에등록된보류있나(재료, 줄.env)) continue;
    const 번호 = Number(줄.id);
    if (막는까닭(await 이어작성상태읽기(번호, undefined, 재료)) === null) return 번호;
  }
  return null;
}

export async function 보류읽기(서비스: number): Promise<보류응답> {
  const 재료 = await 보류재료읽기(서비스);
  const 줄들 = 재료.보류;
  if (줄들.length === 0) return { reqs: {}, roles: [], continueFrom: null };
  const 등록 = 어디든등록(재료.표);
  const reqs: Record<string, string[]> = {};
  const 건수 = new Map<string, number>();
  for (const { reqId, role } of 줄들) {
    (reqs[reqId] ??= []).push(role);
    건수.set(role, (건수.get(role) ?? 0) + 1);
  }
  const roles = [...건수].sort(([a], [b]) => a.localeCompare(b, 'ko')).map(([role, count]) => ({ role, count, registered: 등록.has(role) }));
  return { reqs, roles, continueFrom: roles.some((x) => x.registered) ? await 이어갈뿌리(서비스, 재료) : null };
}
