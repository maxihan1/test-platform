// 결정 목록이 DB 에서 읽는 재료 — 반영 대기 · 할 일 뿌리 · 실패 판정 · 바뀐 API 기준 버전 · 물려받을 대조 뿌리 (도메인/작성 §3.6 「★ 결정 목록」)
// 모양 짓기는 decisions.ts, 규칙은 decisionItems.ts 가 한다

import { 사슬식 } from './chainSql.js';
import { 보류모름 } from './held.js';
import { 남은손들 } from './listTodo.js';
import { 반영할일 } from './applyTodo.js';
import { db } from './store.js';
import { 종류조건 } from '../execution/runKind.js';
import { 지금항목 } from '../execution/single.js';
import { 화면목록식 } from '../prd/screenRight.js';

export interface 손남은뿌리 {
  rootId: number;
  runId: number;
  할일: 'WAITING' | 'FAILED';
  prUrl: string | null;
  requestedByName: string;
  finishedAt: string | null;
  heldOpen: number;
  heldUnknown: boolean;
  conflictsOpen: number;
}

/**
 * 사람 손이 남은 뿌리 — 최신 실행(실패한 반영 포함)이 끝난 작성 · 고치기이거나 실패한 반영. 셈은 목록 todo 와 같은 함수다(listTodo.ts).
 * 폐기한 뿌리는 안 싣는다
 */
export async function 손남은뿌리들(서비스: number): Promise<손남은뿌리[]> {
  const r = await (await db()).query<{
    root_id: string; id: string; kind: string; status: string; pr_url: string | null; finished_at: Date | null; root_by: string; result: unknown;
  }>(
    // PRD 초안은 「PRD 초안」 카드가 따로 싣는다(BTS-F5-04) — 끝난 초안이 반영 대기로 잡히지 않게 뺀다
    `WITH RECURSIVE ${사슬식("service_id = $1 AND source_id IS NULL AND discarded_at IS NULL AND kind <> 'PRD_DRAFT'")}
     SELECT DISTINCT ON (사슬.root_id) 사슬.root_id, a.id, a.kind, a.status, a.pr_url, a.finished_at, a.result,
            (SELECT r.requested_by_name FROM authoring_request r WHERE r.id = 사슬.root_id) AS root_by
       FROM 사슬 JOIN authoring_request a ON a.id = 사슬.id
      ORDER BY 사슬.root_id, a.id DESC`,
    [서비스],
  );
  const 남은 = r.rows.flatMap((x) => {
    const 할일 = 반영할일(x);
    return 할일 === null ? [] : [{ ...x, 할일 }];
  });
  const 손 = await 남은손들(남은.map((x) => Number(x.root_id)));
  return 남은.map((x) => {
    const 셈 = 손.get(Number(x.root_id)) ?? { heldOpen: 0, conflictsOpen: 0 };
    return {
      rootId: Number(x.root_id),
      runId: Number(x.id),
      할일: x.할일,
      prUrl: x.pr_url,
      requestedByName: x.root_by,
      finishedAt: x.finished_at?.toISOString() ?? null,
      heldOpen: 셈.heldOpen,
      heldUnknown: x.kind !== 'MERGE' && 보류모름(x.result),
      conflictsOpen: 셈.conflictsOpen,
    };
  });
}

/** 대기 중인 결정 진행 요청과 그 after — 「뒤에서 #M 이 기다립니다」 */
export async function 기다리는요청들(서비스: number): Promise<{ id: number; after: number[] }[]> {
  const r = await (await db()).query<{ id: string; after: unknown }>(
    `SELECT id, params->'decision'->'after' AS after FROM authoring_request
      WHERE service_id = $1 AND status = 'PENDING' AND discarded_at IS NULL AND params ? 'decision'
      ORDER BY id`,
    [서비스],
  );
  return r.rows.map((x) => ({ id: Number(x.id), after: Array.isArray(x.after) ? x.after.filter((n): n is number => typeof n === 'number') : [] }));
}

export interface 실패줄 {
  runId: number;
  tcId: string;
  historyId: number;
  /** 실패 항목이 든 실행 — 한 건 실행이 덮은 항목이면 그 한 건 실행이다(항목 상세를 이 번호로 연다) */
  itemRunId: number;
  finishedAt: string | null;
}

/**
 * 실패 판정 재료 — 활성 케이스마다 그 케이스가 실제로 돈 가장 최근에 끝난 케이스 실행(시나리오 실행 빼고)이 실패이고, 판정(버그 기록 · 폐기 안 된 화면이 맞음 요청)이 없는 것.
 * 최근 실행 차례다. 요구가 지금 판에 있는지는 부르는 쪽이 지도 ① 로 거른다.
 * 판정은 지금 결과이고 한 건 실행은 고르는 실행이 아니다 — 다시 돌려 통과했으면 실패가 아니다 (도메인/실행 §3.2)
 */
// ponytail: 그 애플리케이션의 끝난 케이스 실행 항목을 다 묶는다. 실행 기록이 수십만 줄이 되면 케이스마다 최근 실행 하나를 LATERAL 로 찾는다
export async function 판정없는실패들(서비스: number): Promise<실패줄[]> {
  const r = await (await db()).query<{ run_id: string; tc_id: string; history_id: string; item_run_id: string; finished_at: Date | null }>(
    `WITH 돈것 AS (
       SELECT i.tc_id, r.run_id, r.finished_at, bool_or(i.status = 'FAIL') AS 실패,
              min(i.history_id) FILTER (WHERE i.status = 'FAIL') AS history_id,
              (array_agg(COALESCE(i.rerun_run_id, i.run_id) ORDER BY i.history_id) FILTER (WHERE i.status = 'FAIL'))[1] AS item_run_id
         FROM test_run r JOIN LATERAL ${지금항목('o.run_id = r.run_id')} i ON true
        WHERE r.service_id = $1 AND ${종류조건('case', 'r')} AND r.status <> 'RUNNING' AND r.origin <> 'SINGLE' AND i.finished_at IS NOT NULL
        GROUP BY i.tc_id, r.run_id, r.finished_at
     ), 최근 AS (
       SELECT DISTINCT ON (tc_id) * FROM 돈것 ORDER BY tc_id, finished_at DESC NULLS LAST, run_id DESC
     ), 화면판정 AS (
       SELECT DISTINCT 칸->>'runId' AS run_id, 칸->>'tcId' AS tc_id
         FROM authoring_request q CROSS JOIN LATERAL jsonb_array_elements(${화면목록식('q.params')}) 칸
        WHERE q.service_id = $1 AND q.discarded_at IS NULL AND q.kind IN ('AUTHOR', 'RERUN')
     )
     SELECT 최근.run_id, 최근.tc_id, 최근.history_id, 최근.item_run_id, 최근.finished_at
       FROM 최근 JOIN test_case t ON t.tc_id = 최근.tc_id AND t.is_active
      WHERE 최근.실패
        AND NOT EXISTS (SELECT 1 FROM run_case_bug b WHERE b.run_id = 최근.run_id AND b.tc_id = 최근.tc_id)
        AND NOT EXISTS (SELECT 1 FROM 화면판정 s WHERE s.run_id = 최근.run_id::text AND s.tc_id = 최근.tc_id)
      ORDER BY 최근.finished_at DESC NULLS LAST, 최근.run_id DESC, 최근.tc_id`,
    [서비스],
  );
  return r.rows.map((x) => ({
    runId: Number(x.run_id),
    tcId: x.tc_id,
    historyId: Number(x.history_id),
    itemRunId: Number(x.item_run_id),
    finishedAt: x.finished_at?.toISOString() ?? null,
  }));
}

/**
 * 바뀐 API 의 기준 — 반영이 병합으로 끝난 API 작성 가운데 가장 늦은 것이 읽은 문서 버전. 바뀐 API 다시 작성은 apiApply.toVersion, API 문서로 작성은 뿌리의 문서 자료 버전.
 * 케이스 고치기 같은 문서를 안 읽은 병합은 건너뛴다. 없으면 null — 처음 작성은 「새 작성」이다
 */
export async function 병합된API버전(서비스: number): Promise<number | null> {
  const r = await (await db()).query<{ version: number | null }>(
    `SELECT x.version FROM (
       SELECT m.finished_at, m.id,
              COALESCE((src.params->'apiApply'->>'toVersion')::int,
                       (SELECT v.version FROM authoring_asset a JOIN api_doc_version v ON v.id = a.api_doc_version_id
                         WHERE a.request_id = CASE WHEN src.kind = 'RERUN' THEN src.source_id ELSE src.id END
                         ORDER BY a.position LIMIT 1)) AS version
         FROM authoring_request m JOIN authoring_request src ON src.id = m.source_id
        WHERE m.service_id = $1 AND m.kind = 'MERGE' AND m.status = 'DONE' AND NOT (src.params ? 'edits')
     ) x WHERE x.version IS NOT NULL
     ORDER BY x.finished_at DESC NULLS LAST, x.id DESC LIMIT 1`,
    [서비스],
  );
  return r.rows[0]?.version ?? null;
}

/** 미검증 화면 보완이 물려받을 대상 서버 · 시작 주소 — 그 애플리케이션의 가장 최근 대조 뿌리. 없으면 null */
export async function 최근대조(서비스: number): Promise<{ env: string; startUrl: string | null } | null> {
  const r = await (await db()).query<{ env: string; start_url: string | null }>(
    `SELECT env, start_url FROM authoring_request
      WHERE service_id = $1 AND kind = 'AUTHOR' AND source_id IS NULL AND compare AND env IS NOT NULL
      ORDER BY id DESC LIMIT 1`,
    [서비스],
  );
  const 행 = r.rows[0];
  return 행 === undefined ? null : { env: 행.env, startUrl: 행.start_url };
}
