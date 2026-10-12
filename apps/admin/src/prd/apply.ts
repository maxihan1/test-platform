// 「바뀐 요구 N건 테스트에 반영」 · 「화면이 맞음」 작성 요청을 세운다 (도메인/작성 §7 apply). store.ts 가 300줄을 넘어 뗐다

import type { PoolClient } from 'pg';

import { 열린반영식 } from '../authoring/chainSql.js';
import { 반영안됨 } from './rules.js';
import { 화면목록식, type 화면이맞음 } from './screenRight.js';
import { 기준판, 잠그고, 지금판, type 저장하는사람 } from './store.js';

/** params.screenRight 한 칸 — 판정 카드가 누른 사람 · 때를 이 칸에서 읽는다(대기 반영에 더한 칸은 요청을 세운 사람과 다르다) */
type 화면칸 = 화면이맞음 & { byName: string; at: string };

export type 세운결과 = { id: number; waitsFor: number[] } | { error: 'NOTHING_TO_APPLY' } | { error: 'APPLY_OPEN'; detail: number[] };

/**
 * 반영 요청 하나를 곧장 줄에 세운다. 반영 안 됨이 0 이면 세우지 않는다.
 * 열린 반영(폐기 안 됨 · 최신 실행이 병합된 반영이 아님)이 있으면 APPLY_OPEN — 두 번 누르면 같은 판을 고치는 PR 이 둘 선다.
 * 「화면이 맞음」(`화면`)은 막지 않는다 (PRD-F9-20) — 아직 안 집힌 반영이 있으면 그 목록에 더하고, 없으면 새로 세운다.
 * 새로 선 것은 앞 반영이 병합 · 폐기될 때까지 에이전트가 안 집는다(agentStore 집기) — 기준 판이 하나라 둘이 같이 돌면 병합 뒤 「반영 안 됨」이 틀어진다.
 * 반영 안 됨이 0 이어도 선다 — 고칠 번호가 따로 있다. 확인과 넣기를 서비스 잠금 안에서 한다(열린 케이스 고치기 EDIT_OPEN 과 같은 꼴)
 */
export async function 반영세우기(서비스: number, 사람: 저장하는사람, 화면?: 화면이맞음): Promise<세운결과> {
  if (화면 === undefined) {
    const [지금, 기준] = await Promise.all([지금판(서비스), 기준판(서비스)]);
    const 차이 = 반영안됨(기준?.items ?? null, 지금?.items ?? []);
    if (차이.changed.length + 차이.added.length + 차이.removed.length === 0) return { error: 'NOTHING_TO_APPLY' };
  }
  return 잠그고(서비스, async (손) => {
    const 열린 = (
      await 손.query<{ root_id: string; latest: string; status: string }>(
        `WITH RECURSIVE ${열린반영식('$1')}
         SELECT o.root_id, o.latest, m.status FROM 열린반영 o JOIN authoring_request m ON m.id = o.latest ORDER BY o.root_id`,
        [서비스],
      )
    ).rows.map((x) => ({ 뿌리: Number(x.root_id), 최신: Number(x.latest), status: x.status }));
    if (화면 === undefined) {
      if (열린.length > 0) return { error: 'APPLY_OPEN' as const, detail: 열린.map((x) => x.뿌리) };
      return { id: await 넣기(손, 서비스, 사람, {}), waitsFor: [] };
    }
    const 앞 = (뿌리: number) => 열린.filter((x) => x.뿌리 < 뿌리).map((x) => x.뿌리);
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
    // 더하는 곳은 아직 안 집힌 뿌리 요청뿐이다 — 재실행 행에 더하면 다음 재실행이 뿌리 것을 물려받아 잃고, 병합(MERGE) 행은 목록을 안 읽는다
    const 대기 = 열린.find((x) => x.최신 === x.뿌리 && x.status === 'PENDING');
    if (대기 !== undefined && (await 더하기(손, 대기.뿌리, 칸))) return { id: 대기.뿌리, waitsFor: 앞(대기.뿌리) };
    return { id: await 넣기(손, 서비스, 사람, { screenRight: [칸] }), waitsFor: 열린.map((x) => x.뿌리) };
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

/** 아직 안 집힌 반영 요청의 목록에 더한다. 그 사이 에이전트가 집었으면 false — 새로 세운다 */
async function 더하기(손: PoolClient, id: number, 칸: 화면칸): Promise<boolean> {
  const r = await 손.query(
    `UPDATE authoring_request SET params = jsonb_set(params, '{screenRight}', ${화면목록식('params')} || $2::jsonb)
      WHERE id = $1 AND status = 'PENDING'`,
    [id, JSON.stringify([칸])],
  );
  return r.rowCount === 1;
}
