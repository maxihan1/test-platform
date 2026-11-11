// 기능 테스트 목록 · 서랍이 보이는 「자동 수정」 재료 — 케이스마다 가장 늦은 bts_test_fix 줄 (도메인/BTS §8.15 「자동 수정 표시」 A)

import type { ItemStatus, Platform } from '@platform/kit';

import type { Pool } from 'pg';


async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** 사람 확인 댓글의 머리말 — 꼴은 `<머리말> — <까닭>` 다음 줄에 PR 주소(testFixMerge.ts 가 단다). needsPerson 이 이 꼴로 찾는다 */
export const 사람확인글 = '사람 확인이 필요해요';

export type 바퀴상태 = 'FIXING' | 'WAIT_MERGE' | 'RERUNNING' | 'PASSED' | 'FAILED' | 'GAVE_UP';

export interface 자동수정줄 {
  issueKey: string;
  state: 바퀴상태;
  at: string;
}

export interface 자동수정상세 extends 자동수정줄 {
  issueUrl: string;
  movedBy: string | null;
  summary: string | null;
  merge: 'AUTO' | 'PERSON' | null;
  prUrl: string | null;
  /** 사람이 화면에서 찾는 실행 — 붙은 한 건이면 붙은 실행 · 새 RERUN 실행이면 그 실행. 이슈 댓글의 「RUN N」 과 같다(§3.12 「테스트 수정 바퀴」 5 · testFixRerun.ts 실행표시) */
  rerunId: number | null;
  /** 그 실행에 결과 화면이 있나 — 붙을 곳이 없던 한 건은 번호만 보인다 */
  rerunPage: boolean;
  reason: string | null;
  /** 병합을 기다리는 줄에 「사람 확인이 필요해요」 댓글을 달았나 — 자동 병합에 걸렸거나 자동 반영이 실패했다(testFixMerge.ts) */
  needsPerson: boolean;
  devices: { platform: Platform; status: ItemStatus }[];
}

// BTS 를 이은 프로젝트만 — 연결을 끊으면 표시도 사라진다(§8.15 지킬 것 1). 대상 서버는 가리지 않는다
const 가장늦은 = `
  SELECT DISTINCT ON (f.tc_id) f.*, l.base_url
    FROM bts_test_fix f JOIN service s ON s.id = f.service_id JOIN bts_link l ON l.project_id = s.project_id`;
const 차례 = 'ORDER BY f.tc_id, f.created_at DESC, f.id DESC';

/** 그 애플리케이션 케이스마다 가장 늦은 줄. 목록의 표시 · 탭 · 거르기가 모두 이것을 본다 */
export async function 자동수정목록(서비스접두사: string): Promise<Map<string, 자동수정줄>> {
  const rows = await (await db()).query<{ tc_id: string; issue_key: string; state: 바퀴상태; updated_at: Date }>(
    `${가장늦은} WHERE s.prefix = $1 ${차례}`,
    [서비스접두사],
  );
  return new Map(rows.rows.map((r) => [r.tc_id, { issueKey: r.issue_key, state: r.state, at: r.updated_at.toISOString() }]));
}

/** 서랍 「자동 수정 기록」 — 가장 늦은 줄 하나. 없거나 BTS 연결이 없으면 null */
export async function 자동수정상세읽기(tcId: string): Promise<자동수정상세 | null> {
  const pool = await db();
  const 줄 = (
    await pool.query<{
      issue_key: string;
      state: 바퀴상태;
      updated_at: Date;
      base_url: string;
      moved_by: string | null;
      summary: string | null;
      merge: 'AUTO' | 'PERSON' | null;
      pr_url: string | null;
      rerun_id: string | null;
      shown_run: string | null;
      has_page: boolean;
      reason: string | null;
      needs_person: boolean;
    }>(
      `SELECT g.*, CASE WHEN r.origin = 'SINGLE' THEN COALESCE(r.rerun_of, r.run_id) ELSE r.run_id END AS shown_run,
              NOT (r.origin = 'SINGLE' AND r.rerun_of IS NULL) AS has_page,
              (g.state = 'WAIT_MERGE' AND g.pr_url IS NOT NULL AND EXISTS (
                SELECT 1 FROM bts_outbox o
                 WHERE o.project_id = g.project_id AND o.kind = 'COMMENT' AND o.issue_key = g.issue_key
                   AND starts_with(o.payload->>'body', $2) AND right(o.payload->>'body', length(g.pr_url) + 1) = E'\\n' || g.pr_url)) AS needs_person
         FROM (${가장늦은} WHERE f.tc_id = $1 ${차례}) g
         LEFT JOIN test_run r ON r.run_id = g.rerun_id`,
      [tcId, 사람확인글],
    )
  ).rows[0];
  if (줄 === undefined) return null;
  const 기기 =
    줄.rerun_id === null
      ? []
      : (
          await pool.query<{ platform: Platform; status: ItemStatus }>(
            'SELECT platform, status FROM run_item WHERE run_id = $1 AND tc_id = $2 ORDER BY platform',
            [줄.rerun_id, tcId],
          )
        ).rows;
  return {
    issueKey: 줄.issue_key,
    issueUrl: `${줄.base_url.replace(/\/+$/, '')}/issues/${encodeURIComponent(줄.issue_key)}`,
    state: 줄.state,
    at: 줄.updated_at.toISOString(),
    movedBy: 줄.moved_by,
    summary: 줄.summary,
    merge: 줄.merge,
    prUrl: 줄.pr_url,
    rerunId: 줄.shown_run === null ? null : Number(줄.shown_run),
    rerunPage: 줄.has_page === true,
    reason: 줄.reason,
    needsPerson: 줄.needs_person,
    devices: 기기.map((d) => ({ platform: d.platform, status: d.status })),
  };
}

// ── 실행 기록 B (F10-08) — 실패 카드 · 실행 목록 줄 ──

// BTS 를 이은 프로젝트의 통과한 줄만 — 연결을 끊으면 표시도 사라진다(§8.15 지킬 것 1)
const 통과줄 = `bts_test_fix f JOIN service s ON s.id = f.service_id JOIN bts_link l ON l.project_id = s.project_id`;

/**
 * 끼울 한 건 실행 `sr` 에 더하는 조건 — 자동 수정으로 통과한 다시 실행은 빼고 고치기 전 결과를 본다.
 * 붙은 한 건이 통과로 바꿔 끼우면 실패 카드가 사라져 「수정 후 통과」 카드를 세울 수 없다
 */
export const 자동수정실행빼기 = ` AND NOT EXISTS (SELECT 1 FROM ${통과줄} WHERE f.state = 'PASSED' AND f.rerun_id = sr.run_id)`;

export interface 카드자동수정 {
  issueKey: string;
  issueUrl: string;
  prUrl: string | null;
  merge: 'AUTO' | 'PERSON' | null;
  /** 사람이 화면에서 찾는 실행 — 서랍 「확인」 · 이슈 댓글 「RUN N」 과 같다 */
  rerunId: number | null;
  at: string;
  devices: { platform: Platform; status: ItemStatus }[];
}

/** 이 실행을 처음 실패(failed_run)로 가진 통과 줄 — 케이스마다 가장 늦은 것. 카드(실행 · 케이스 · 대상 서버)에 하나 */
export async function 카드자동수정들(runId: number): Promise<Map<string, 카드자동수정>> {
  const pool = await db();
  const 줄들 = (
    await pool.query<{
      tc_id: string;
      issue_key: string;
      pr_url: string | null;
      merge: 'AUTO' | 'PERSON' | null;
      rerun_id: string | null;
      shown_run: string | null;
      updated_at: Date;
      base_url: string;
    }>(
      `SELECT DISTINCT ON (f.tc_id) f.tc_id, f.issue_key, f.pr_url, f.merge, f.rerun_id, f.updated_at, l.base_url,
              CASE WHEN r.origin = 'SINGLE' THEN COALESCE(r.rerun_of, r.run_id) ELSE r.run_id END AS shown_run
         FROM ${통과줄} LEFT JOIN test_run r ON r.run_id = f.rerun_id
        WHERE f.state = 'PASSED' AND f.failed_run = $1 AND f.env = (SELECT env FROM test_run WHERE run_id = $1)
        ${차례}`,
      [runId],
    )
  ).rows;
  const 다시실행들 = 줄들.flatMap((x) => (x.rerun_id === null ? [] : [x.rerun_id]));
  const 기기들 =
    다시실행들.length === 0
      ? []
      : (
          await pool.query<{ run_id: string; tc_id: string; platform: Platform; status: ItemStatus }>(
            'SELECT run_id, tc_id, platform, status FROM run_item WHERE run_id = ANY($1::bigint[]) ORDER BY platform',
            [다시실행들],
          )
        ).rows;
  return new Map(
    줄들.map((x) => [
      x.tc_id,
      {
        issueKey: x.issue_key,
        issueUrl: `${x.base_url.replace(/\/+$/, '')}/issues/${encodeURIComponent(x.issue_key)}`,
        prUrl: x.pr_url,
        merge: x.merge,
        rerunId: x.shown_run === null ? null : Number(x.shown_run),
        at: x.updated_at.toISOString(),
        devices: 기기들.filter((d) => d.run_id === x.rerun_id && d.tc_id === x.tc_id).map((d) => ({ platform: d.platform, status: d.status })),
      },
    ]),
  );
}

/** 실행 줄 「자동 수정 N」 — 그 실행을 처음 실패로 가진 통과 케이스 수. 카드의 autoFixCount 와 같게 케이스로 센다(같은 케이스를 두 번 고쳐도 카드는 하나) */
export async function 자동수정수들(runIds: number[]): Promise<Map<number, number>> {
  if (runIds.length === 0) return new Map();
  const rows = await (await db()).query<{ failed_run: string; n: number }>(
    `SELECT f.failed_run, count(DISTINCT f.tc_id)::int AS n FROM ${통과줄}
      WHERE f.state = 'PASSED' AND f.failed_run = ANY($1::bigint[]) GROUP BY f.failed_run`,
    [runIds],
  );
  return new Map(rows.rows.map((r) => [Number(r.failed_run), r.n]));
}
