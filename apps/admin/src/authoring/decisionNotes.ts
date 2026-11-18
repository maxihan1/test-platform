// 결정 목록 「설명 안 되는 줄」 — 돌려 본 게임 시나리오가 남긴 verify.note 를 이슈 등록 · PRD 수정으로 가르는 항목 (도메인/게임 §3.10 결정 24 의 5 · 작성 §3.6 「★ 결정 목록」)

import type { PrdItem } from '@platform/kit';

import { 종류조건 } from '../execution/runKind.js';
import { findItem } from '../execution/queries.js';
import { 멈춰닫힌항목아님, 지금항목 } from '../execution/single.js';
import { 케이스지도 } from '../prd/store.js';
import type { 결정항목, 고르기 } from './decisionItems.js';
import { db } from './store.js';

interface 설명줄 {
  runId: number;
  tcId: string;
  name: string;
  historyId: number;
  itemRunId: number;
  finishedAt: string | null;
}

/**
 * 게임 시나리오(-GS-) 케이스마다 그 케이스가 돈 가장 최근에 끝난 케이스 실행에 설명 안 되는 줄(판정 NA 문장)이 있고 판정(run_case_note)이 없는 것.
 * 고르는 실행은 실패 판정과 같다(decisionReads.ts 판정없는실패들) — 한 건 실행이 덮은 항목은 그 항목을 본다
 */
async function 판정없는설명들(서비스: number): Promise<설명줄[]> {
  const r = await (await db()).query<{ run_id: string; tc_id: string; name: string; history_id: string; item_run_id: string; finished_at: Date | null }>(
    `WITH 돈것 AS (
       SELECT i.tc_id, r.run_id, r.finished_at,
              min(i.history_id) FILTER (WHERE n.있음) AS history_id,
              (array_agg(COALESCE(i.rerun_run_id, i.run_id) ORDER BY i.history_id) FILTER (WHERE n.있음))[1] AS item_run_id
         FROM test_run r JOIN LATERAL ${지금항목('o.run_id = r.run_id')} i ON true
         CROSS JOIN LATERAL (
           SELECT EXISTS (SELECT 1 FROM run_item_step s CROSS JOIN LATERAL jsonb_array_elements(s.assertions) a
                           WHERE s.history_id = i.history_id AND a->>'status' = 'NA') AS 있음
         ) n
        WHERE r.service_id = $1 AND ${종류조건('case', 'r')} AND r.status NOT IN ('RUNNING', 'PREP_FAILED') AND r.origin <> 'SINGLE' AND i.finished_at IS NOT NULL
          AND ${멈춰닫힌항목아님('i')} AND i.tc_id LIKE '%-GS-%'
        GROUP BY i.tc_id, r.run_id, r.finished_at
     ), 최근 AS (
       SELECT DISTINCT ON (tc_id) * FROM 돈것 ORDER BY tc_id, finished_at DESC NULLS LAST, run_id DESC
     )
     SELECT 최근.run_id, 최근.tc_id, t.name, 최근.history_id, 최근.item_run_id, 최근.finished_at
       FROM 최근 JOIN test_case t ON t.tc_id = 최근.tc_id AND t.is_active
      WHERE 최근.history_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM run_case_note x WHERE x.run_id = 최근.run_id AND x.tc_id = 최근.tc_id)
      ORDER BY 최근.finished_at DESC NULLS LAST, 최근.run_id DESC, 최근.tc_id`,
    [서비스],
  );
  return r.rows.map((x) => ({
    runId: Number(x.run_id),
    tcId: x.tc_id,
    name: x.name,
    historyId: Number(x.history_id),
    itemRunId: Number(x.item_run_id),
    finishedAt: x.finished_at?.toISOString() ?? null,
  }));
}

/**
 * ② 「설명 안 되는 줄」 — 지금 판에 있는 요구를 덮는 케이스만(고칠 기획서 문장이 없으면 PRD 수정을 못 한다 — 실패 판정과 같다).
 * 줄 문장 · 값은 항목 상세와 같은 함수로 가린 뒤 고른다 — 비밀값이 결정 목록으로 새지 않게.
 * BTS 를 이은 프로젝트도 싣는다 — 이 줄은 BTS 로 안 간다. 이슈 등록은 판정 기록만 남긴다
 */
export async function 설명묶음(
  서비스: number,
  판: PrdItem[],
  누구: { 작성쓰기: boolean; 실행읽기: boolean; 실행쓰기: boolean },
): Promise<결정항목[]> {
  if (!누구.실행읽기) return [];
  const [줄들, 지도] = await Promise.all([판정없는설명들(서비스), 케이스지도(서비스)]);
  const 고를것 = 누구.작성쓰기
    ? { picks: (누구.실행쓰기 ? ['BUG', 'EDIT'] : ['EDIT']) as 고르기[], blockedBy: 누구.실행쓰기 ? null : ('NO_RUN_WRITE' as const) }
    : { picks: [] as 고르기[], blockedBy: 'NO_WRITE' as const };
  const 항목들 = await Promise.all(
    줄들.map(async (f): Promise<결정항목 | null> => {
      const 덮음 = new Set(Object.entries(지도).flatMap(([reqId, 케이스들]) => (케이스들.some((c) => c.tcId === f.tcId) ? [reqId] : [])));
      const reqs = 판.filter((x) => 덮음.has(x.reqId)).map((x) => ({ reqId: x.reqId, text: x.text }));
      if (reqs.length === 0) return null;
      const 항목 = await findItem(f.itemRunId, f.historyId);
      const notes = (항목?.steps ?? []).flatMap((s) => s.assertions.filter((a) => a.status === 'NA').map((a) => ({ statement: a.statement, actual: a.actual ?? null })));
      if (notes.length === 0) return null;
      return { key: `note:${String(f.runId)}:${f.tcId}`, group: 2, kind: 'NOTE', ...고를것, runId: f.runId, tcId: f.tcId, name: f.name, reqs, notes, finishedAt: f.finishedAt };
    }),
  );
  return 항목들.filter((x): x is 결정항목 => x !== null);
}

/** 판정 한 줄 — 이미 누가 판정했으면 false(그 사이 다른 사람이 골랐다) */
export async function 설명판정남기기(
  손: { query: (sql: string, values: unknown[]) => Promise<{ rowCount: number | null }> },
  runId: number,
  tcId: string,
  verdict: 'BUG' | 'RULE',
  누가: { username: string; displayName: string },
): Promise<boolean> {
  const r = await 손.query(
    `INSERT INTO run_case_note (run_id, tc_id, verdict, marked_by, marked_by_name) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (run_id, tc_id) DO NOTHING`,
    [runId, tcId, verdict, 누가.username, 누가.displayName],
  );
  return r.rowCount === 1;
}
