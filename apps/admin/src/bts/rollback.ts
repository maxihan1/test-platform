// 롤백 되돌리기 — 롤백 배포가 받은 이슈 키로 바뀐 PRD 요구만 되돌린 판(ROLLBACK)과 테스트 되돌림 요청을 세우고, 다시 배포되면 그 요청을 거둔다 (도메인/BTS 「롤백 바퀴」 · BTS-F7-01)

import type { Pool, PoolClient } from 'pg';
import type { PrdItem } from '@platform/kit';

import { 사슬식 } from '../authoring/chainSql.js';
import { 열린작성 } from '../authoring/openRoots.js';
import { 줄세우기 } from '../authoring/store.js';
import type { 판변경 } from '../prd/changes.js';
import { 판같나 } from '../prd/rules.js';
import { 롤백판넣기, 잠그고 } from '../prd/store.js';

import type { 배포사람 } from './deployFlow.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** 판 기록 한 줄 */
export interface 판기록 {
  version: number;
  source: string;
  items: PrdItem[];
  changes: 판변경[] | null;
}

/**
 * 받은 키가 닿은 요구를 그 키가 처음 닿은 판 바로 앞 모습으로 돌린 판. 되돌릴 것이 없으면 changes 가 빈다.
 * 「처음 닿은 판」은 항목의 fromIssues 에 키가 처음 보인 판, 또는 키로 지운 줄(DEL)이 든 판이다 — 지운 항목은 지금 판에 없어 꼬리표가 붙을 자리가 없다.
 * 앞 판에 없던 항목은 지우고, 있던 항목은 그 모습 그대로 돌린다(지운 번호는 다시 안 주므로 lastNo 는 그대로다)
 * ponytail: 키가 닿은 뒤 다른 이슈가 같은 요구를 또 고쳤으면 그 고침도 같이 사라진다(BTS-F7-01 시작 질문 4) — 잦아지면 판마다 거꾸로 되짚는다
 */
export function 롤백판(기록: readonly 판기록[], 키들: readonly string[]): { items: PrdItem[]; changes: 판변경[] } {
  const 키 = new Set(키들);
  const 닿은키 = (ks: string[] | undefined) => (ks ?? []).filter((k) => 키.has(k));
  const 처음 = new Map<string, { 앞: PrdItem | undefined; 키: Set<string> }>();
  let 앞판 = new Map<string, PrdItem>();
  const 차례 = [...기록].sort((a, b) => a.version - b.version);
  for (const 판 of 차례) {
    const 찾음 = (reqId: string, ks: string[]) => {
      if (ks.length === 0) return;
      const 있음 = 처음.get(reqId);
      if (있음 === undefined) 처음.set(reqId, { 앞: 앞판.get(reqId), 키: new Set(ks) });
      else ks.forEach((k) => 있음.키.add(k));
    };
    for (const x of 판.items) 찾음(x.reqId, 닿은키(x.fromIssues));
    // 앞 롤백 판의 줄은 되돌린 기록이라 「처음 닿은 판」이 아니다
    if (판.source !== 'ROLLBACK') for (const c of 판.changes ?? []) if (c.kind === 'DEL') 찾음(c.reqId, 닿은키(c.issueKeys));
    앞판 = new Map(판.items.map((x) => [x.reqId, x]));
  }
  const 판 = 앞판;
  const changes: 판변경[] = [];
  for (const [reqId, { 앞, 키: ks }] of 처음) {
    const 지금것 = 판.get(reqId);
    const 줄 = { asset: null, tcId: null, issueKeys: [...ks].sort() };
    if (앞 === undefined) {
      if (지금것 === undefined) continue;
      판.delete(reqId);
      changes.push({ kind: 'DEL', reqId, text: null, ...줄 });
      continue;
    }
    if (지금것 !== undefined && 판같나([지금것], [앞])) continue;
    판.set(reqId, 앞);
    changes.push({ kind: 지금것 === undefined ? 'ADD' : 'EDIT', reqId, text: 앞.text, ...줄 });
  }
  return { items: [...판.values()].sort((a, b) => a.reqId.localeCompare(b.reqId)), changes };
}

// 대기는 멈추고 도는 것은 멈춤을 건 채 버린다 — 집기는 폐기를 안 보므로 대기 줄은 STOPPED 로 닫아야 다시 안 집힌다
const 멈추고버리기 = `discarded_at = now(),
  status = CASE WHEN status = 'PENDING' THEN 'STOPPED' ELSE status END,
  stop_reason = CASE WHEN status = 'PENDING' THEN 'USER' ELSE stop_reason END,
  finished_at = CASE WHEN status = 'PENDING' THEN now() ELSE finished_at END,
  stop_requested_at = CASE WHEN status = 'RUNNING' THEN COALESCE(stop_requested_at, now()) ELSE stop_requested_at END`;

/**
 * 롤백 배포가 받은 키로 애플리케이션마다 ROLLBACK 판을 짓고, 바뀌었으면 「고친 요구만 다시 작성」 요청을 세운다.
 * 요청은 그때 열린 작성이 끝날 때까지 기다린다(decision.after — 닫기 사유가 세우는 요청과 같은 길, close.ts). 서버가 세우는 일이라 409 를 받을 사람이 없다.
 * 그 키를 다루던 작성 중 · 확인 대기 PRD 초안은 버린다. 이미 고른 초안은 판에 들어갔으니 위 판이 되돌린다
 */
export async function 롤백되돌리기(deployId: number, projectId: number, buildNo: string, 키들: string[], 사람: 배포사람): Promise<number[]> {
  const pool = await db();
  const 앱들 = (await pool.query<{ id: string }>('SELECT id FROM service WHERE project_id = $1 AND is_active ORDER BY id', [projectId])).rows.map((x) => Number(x.id));
  const 요청들: number[] = [];
  for (const 서비스 of 앱들) {
    const id = await 잠그고(서비스, async (손) => {
      // ponytail: 판을 전부 읽는다 — 롤백은 드물다. 판이 수천이 되면 키가 닿은 판과 그 앞 판만 읽는다
      const 기록 = (await 손.query<판기록>('SELECT version, source, items, changes FROM prd_version WHERE service_id = $1 ORDER BY version', [서비스])).rows;
      const 새 = 롤백판(기록, 키들);
      if (새.changes.length === 0) return null;
      await 롤백판넣기(손, 서비스, 새.items, 사람, 새.changes, deployId);
      const 열린 = await 열린작성(서비스, 손);
      return 줄세우기(
        {
          서비스,
          kind: 'AUTHOR',
          기획서: null,
          값: { prdApply: true, rollbackDeploy: deployId, rollbackBuild: buildNo, decision: { after: 열린, count: 1 } },
          누가: 사람.username,
          이름: 사람.displayName,
        },
        손,
      );
    });
    if (id !== null) 요청들.push(id);
  }
  await pool.query(
    `UPDATE authoring_request SET ${멈추고버리기}
      WHERE kind = 'PRD_DRAFT' AND discarded_at IS NULL AND service_id = ANY($1::bigint[])
        AND params->'issueKeys' ?| $2::text[] AND NOT (status = 'DONE' AND COALESCE(result ? 'picked', false))`,
    [앱들, 키들],
  );
  return 요청들;
}

/**
 * 롤백 뒤 다시 배포되면 앞 롤백이 세운 되돌림 요청을 거둔다 — 병합 전이면 사슬 전부를 폐기하고, 열린 PR 은 작성 에이전트가 닫는다(닫을PR).
 * 병합했거나 병합 중이면 그대로 둔다. 같은 빌드를 다시 보낸 것(실패한 배포 다시 보내기)은 다시 배포가 아니다. 거둔 행 번호를 준다
 */
export async function 되돌림거두기(projectId: number, deployId: number, buildNo: string, 손?: PoolClient): Promise<number[]> {
  const r = await (손 ?? (await db())).query<{ id: string }>(
    `WITH RECURSIVE ${사슬식(
      `kind = 'AUTHOR' AND discarded_at IS NULL AND params ? 'rollbackDeploy'
       AND (params->>'rollbackDeploy')::bigint < $2 AND params->>'rollbackBuild' <> $3
       AND service_id IN (SELECT id FROM service WHERE project_id = $1)`,
    )},
     병합 AS (SELECT 사슬.root_id FROM 사슬 JOIN authoring_request m ON m.id = 사슬.id WHERE m.kind = 'MERGE' AND m.status IN ('RUNNING', 'DONE'))
     UPDATE authoring_request SET ${멈추고버리기}
       FROM 사슬 WHERE authoring_request.id = 사슬.id AND authoring_request.discarded_at IS NULL AND 사슬.root_id NOT IN (SELECT root_id FROM 병합)
     RETURNING authoring_request.id`,
    [projectId, deployId, buildNo],
  );
  return r.rows.map((x) => Number(x.id));
}

/** 거둔 되돌림 요청이 연 PR 가운데 아직 안 닫은 것 — PR 하나에 가장 늦은 실행 번호 하나 */
export async function 닫을PR(서비스: number): Promise<{ id: number; prUrl: string }[]> {
  const r = await (await db()).query<{ id: string; pr_url: string }>(
    `WITH RECURSIVE ${사슬식(`service_id = $1 AND kind = 'AUTHOR' AND params ? 'rollbackDeploy' AND discarded_at IS NOT NULL`)}
     SELECT DISTINCT ON (a.pr_url) a.id, a.pr_url FROM 사슬 JOIN authoring_request a ON a.id = 사슬.id
      WHERE a.kind <> 'MERGE' AND a.pr_url IS NOT NULL AND NOT COALESCE(a.result ? 'prClosed', false)
      ORDER BY a.pr_url, a.id DESC`,
    [서비스],
  );
  return r.rows.map((x) => ({ id: Number(x.id), prUrl: x.pr_url }));
}

/** 그 PR 을 닫았다고 적는다 — 같은 애플리케이션에서 같은 PR 을 가리키는 행 전부. 폐기된 행이 아니면 false. 닫을PR 이 준 번호는 재실행 행일 수 있어 뿌리의 롤백 표시는 안 본다 */
export async function PR닫음적기(id: number): Promise<boolean> {
  const r = await (await db()).query(
    `UPDATE authoring_request SET result = COALESCE(result, '{}'::jsonb) || '{"prClosed": true}'::jsonb
      WHERE (service_id, pr_url) = (SELECT service_id, pr_url FROM authoring_request WHERE id = $1 AND discarded_at IS NOT NULL AND pr_url IS NOT NULL)`,
    [id],
  );
  return (r.rowCount ?? 0) > 0;
}
