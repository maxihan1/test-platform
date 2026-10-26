// 「바뀐 요구 N건 테스트에 반영」 · 「화면이 맞음」 작성 요청을 세운다 (도메인/작성 §7 apply). store.ts 가 300줄을 넘어 뗐다

import type { PoolClient } from 'pg';

import { 열린반영식 } from '../authoring/chainSql.js';
import { 열린작성 } from '../authoring/openRoots.js';
import { 반영안됨 } from './rules.js';
import { 화면목록식, type 화면이맞음 } from './screenRight.js';
import { 기준판, 잠그고, 지금판, type 저장하는사람 } from './store.js';

/** params.screenRight 한 칸 — 판정 카드가 누른 사람 · 때를 이 칸에서 읽는다(대기 반영에 더한 칸은 요청을 세운 사람과 다르다) */
type 화면칸 = 화면이맞음 & { byName: string; at: string };

export type 세운결과 =
  | { id: number; waitsFor: number[] }
  | { error: 'NOTHING_TO_APPLY' }
  | { error: 'APPLY_OPEN' | 'AUTHORING_OPEN'; detail: number[] };

/**
 * 반영 요청 하나를 곧장 줄에 세운다. 반영 안 됨이 0 이면 세우지 않는다.
 * 열린 작성(authoring/openRoots.ts)이 있으면 AUTHORING_OPEN — 「화면이 맞음」(`화면`)도 같다(2026-10-26 · 앞 판 PRD-F9-20 은 대기 중인 반영에 더했다).
 * 그 밖에 열린 반영(폐기 안 됨 · 최신 실행이 병합된 반영이 아님 — 실패 · 중단한 반영)이 있으면 APPLY_OPEN — 폐기해야 다시 누른다.
 * 「화면이 맞음」은 그때도 서고, 앞 반영이 병합 · 폐기될 때까지 에이전트가 안 집는다(agentStore 집기) — 기준 판이 하나라 둘이 같이 돌면 병합 뒤 「반영 안 됨」이 틀어진다.
 * 반영 안 됨이 0 이어도 선다 — 고칠 번호가 따로 있다. 확인과 넣기를 서비스 잠금 안에서 한다(열린 케이스 고치기 EDIT_OPEN 과 같은 꼴)
 */
export async function 반영세우기(서비스: number, 사람: 저장하는사람, 화면?: 화면이맞음): Promise<세운결과> {
  if (화면 === undefined) {
    const [지금, 기준] = await Promise.all([지금판(서비스), 기준판(서비스)]);
    const 차이 = 반영안됨(기준?.items ?? null, 지금?.items ?? []);
    if (차이.changed.length + 차이.added.length + 차이.removed.length === 0) return { error: 'NOTHING_TO_APPLY' };
  }
  return 잠그고(서비스, async (손) => {
    // 반영 안 된 작성이 있으면 「화면이 맞음」도 안 세운다 — 결정 진행 밖의 반영 요청이다(§3.6 「★ 결정 목록」 「서버 막기」).
    // 첫 작성이 병합 전이면 기준 판이 없어 요구 전부가 다시 써진다(#14679)
    const 작성 = await 열린작성(서비스, 손);
    if (작성.length > 0) return { error: 'AUTHORING_OPEN' as const, detail: 작성 };
    const 열린 = (
      await 손.query<{ root_id: string }>(`WITH RECURSIVE ${열린반영식('$1')} SELECT root_id FROM 열린반영 ORDER BY root_id`, [서비스])
    ).rows.map((x) => Number(x.root_id));
    if (화면 === undefined) {
      if (열린.length > 0) return { error: 'APPLY_OPEN' as const, detail: 열린 };
      return { id: await 넣기(손, 서비스, 사람, {}), waitsFor: [] };
    }
    const 앞 = (뿌리: number) => 열린.filter((x) => x < 뿌리);
    // 같은 실행 · 케이스가 열린 반영 어디에든 이미 있으면 새로 세우지 않는다 — 다른 탭에서 또 누르면 같은 요구를 고치는 PR 이 둘 선다
    const 있던 = await 손.query<{ root_id: string; id: string }>(
      `WITH RECURSIVE ${열린반영식('$1')}
       SELECT s.root_id, a.id FROM 사슬 s JOIN 열린반영 o ON o.root_id = s.root_id JOIN authoring_request a ON a.id = s.id
        WHERE ${화면목록식('a.params')} @> $2::jsonb ORDER BY a.id DESC LIMIT 1`,
      [서비스, JSON.stringify([{ runId: 화면.runId, tcId: 화면.tcId }])],
    );
    const 그것 = 있던.rows[0];
    if (그것 !== undefined) return { id: Number(그것.id), waitsFor: 앞(Number(그것.root_id)) };
    const 칸: 화면칸 = { ...화면, byName: 사람.displayName, at: new Date().toISOString() };
    return { id: await 넣기(손, 서비스, 사람, { screenRight: [칸] }), waitsFor: 열린 };
  });
}

async function 넣기(손: PoolClient, 서비스: number, 사람: 저장하는사람, 더할: object): Promise<number> {
  const r = await 손.query<{ id: string }>(
    `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status)
     VALUES ($1, 'AUTHOR', $4, $2, $3, 'PENDING') RETURNING id`,
    [서비스, 사람.username, 사람.displayName, JSON.stringify({ prdApply: true, ...더할 })],
  );
  return Number(r.rows[0]!.id);
}
