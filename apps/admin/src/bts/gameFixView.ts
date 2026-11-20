// 게임 실패 자동 수정이 실패 카드 · 결정 목록에 보이는 재료 — issue_key 가 없는 bts_test_fix 줄 (도메인/게임 §3.10 「실패 자동 수정」 7)

import type { Pool } from 'pg';

import type { 판정자동수정 } from '../authoring/decisionItems.js';
import type { 바퀴상태 } from './testFixView.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export interface 카드자동수정중 {
  state: Exclude<바퀴상태, 'PASSED'>;
  requestId: number | null;
  prUrl: string | null;
  needsPerson: boolean;
  personWhy: string[];
  rerunId: number | null;
  rerunPage: boolean;
  reason: string | null;
  at: string;
}

// 사람이 화면에서 찾는 실행 — 붙은 한 건이면 붙은 실행, 붙을 곳이 없던 한 건이면 번호만(testFixView.ts 와 같다)
const 다시실행칸 = `CASE WHEN r.origin = 'SINGLE' THEN COALESCE(r.rerun_of, r.run_id) ELSE r.run_id END AS shown_run,
       NOT (r.origin = 'SINGLE' AND r.rerun_of IS NULL) AS has_page`;

interface 줄원본 {
  tc_id: string;
  failed_run: string | null;
  state: 바퀴상태;
  request_id: string | null;
  pr_url: string | null;
  person_why: string[];
  reason: string | null;
  updated_at: Date;
  shown_run: string | null;
  has_page: boolean | null;
}

/** 이 실행을 처음 실패로 가진 게임 줄 가운데 통과하지 못한 가장 늦은 것 — 케이스마다 하나. 카드가 「자동 수정 중 · 실패」를 보인다 */
export async function 카드자동수정중들(runId: number): Promise<Map<string, 카드자동수정중>> {
  const rows = await (await db()).query<줄원본>(
    `SELECT DISTINCT ON (f.tc_id) f.tc_id, f.failed_run, f.state, f.request_id, f.pr_url, f.person_why, f.reason, f.updated_at, ${다시실행칸}
       FROM bts_test_fix f LEFT JOIN test_run r ON r.run_id = f.rerun_id
      WHERE f.issue_key IS NULL AND f.state <> 'PASSED' AND f.failed_run = $1 AND f.env = (SELECT env FROM test_run WHERE run_id = $1)
      ORDER BY f.tc_id, f.created_at DESC, f.id DESC`,
    [runId],
  );
  return new Map(
    rows.rows.map((x) => [
      x.tc_id,
      {
        state: x.state as Exclude<바퀴상태, 'PASSED'>,
        requestId: x.request_id === null ? null : Number(x.request_id),
        prUrl: x.pr_url,
        needsPerson: x.state === 'WAIT_MERGE' && x.person_why.length > 0,
        personWhy: x.person_why,
        rerunId: x.shown_run === null ? null : Number(x.shown_run),
        rerunPage: x.has_page === true,
        reason: x.reason,
        at: x.updated_at.toISOString(),
      },
    ]),
  );
}

/**
 * 결정 목록 「결함 판정」 재료 — 케이스마다 가장 늦은 게임 줄. 키는 `실행번호:tcId`.
 * 숨김은 아직 판정할 것이 없다는 뜻이다(도는 중 · 통과). 끝난 줄(FAILED · FLAKY · GAVE_UP)은 autoFix 로 달고 선다
 */
export async function 판정자동수정들(서비스: number): Promise<Map<string, { 숨김: boolean; autoFix: 판정자동수정 | null }>> {
  const rows = await (await db()).query<줄원본>(
    `SELECT DISTINCT ON (f.tc_id) f.tc_id, f.failed_run, f.state, f.request_id, f.pr_url, f.person_why, f.reason, f.updated_at, ${다시실행칸}
       FROM bts_test_fix f LEFT JOIN test_run r ON r.run_id = f.rerun_id
      WHERE f.issue_key IS NULL AND f.service_id = $1 AND f.failed_run IS NOT NULL
      ORDER BY f.tc_id, f.created_at DESC, f.id DESC`,
    [서비스],
  );
  return new Map(
    rows.rows.map((x) => {
      const 끝남 = x.state === 'FAILED' || x.state === 'FLAKY' || x.state === 'GAVE_UP';
      return [
        `${x.failed_run}:${x.tc_id}`,
        {
          숨김: !끝남,
          autoFix: 끝남
            ? {
                state: x.state as 판정자동수정['state'],
                prUrl: x.pr_url,
                rerunId: x.shown_run === null ? null : Number(x.shown_run),
                rerunPage: x.has_page === true,
                reason: x.reason,
              }
            : null,
        },
      ];
    }),
  );
}
