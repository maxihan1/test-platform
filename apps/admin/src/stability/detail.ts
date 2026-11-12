// 오류 종류 하나의 상세 — 숫자 넷 · 발생 케이스 · 견본 셋 · 7일 추이 · 디바이스 · AI 요약 · Issue Bunker 칸 (도메인/안정화 §7 GET /api/stability/errors/:id)

import type { Pool } from 'pg';

import type { 상태 } from './state.js';
import { 요약읽기 } from './view.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export interface 오류행 {
  id: string;
  service_id: string;
  env: string;
  title: string;
  message: string | null;
  source: string;
  first_run_id: string;
  first_day: string;
  first_build_no: string | null;
  resolved_at: Date | null;
  confirmed_run_id: string | null;
  issue_key: string | null;
  project_id: string;
  service_name: string;
  prefix: string;
  base_url: string | null;
  bts_project: string | null;
}

export async function 오류읽기(errorId: number): Promise<오류행 | undefined> {
  return (
    await (await db()).query<오류행>(
      `SELECT e.id, e.service_id, e.env, e.title, e.message, e.source, e.first_run_id, to_char(e.first_day, 'YYYY-MM-DD') AS first_day, e.first_build_no,
              e.resolved_at, e.confirmed_run_id, e.issue_key, s.project_id, s.name AS service_name, s.prefix, l.base_url, l.bts_project
         FROM stab_error e JOIN service s ON s.id = e.service_id LEFT JOIN bts_link l ON l.project_id = s.project_id
        WHERE e.id = $1`,
      [errorId],
    )
  ).rows[0];
}

/** 기다리는 STAB_CREATE 줄이 있는가 — 보낸 뒤 키는 stab_error.issue_key 에 찬다 */
export const 등록기다림SQL = `SELECT 1 FROM bts_outbox WHERE kind = 'STAB_CREATE' AND state = 'PENDING' AND (payload->>'stabErrorId')::bigint = $1 LIMIT 1`;

// 디바이스 칸 「Galaxy S23 · Android 14」 — 앞이 이름, 뒤가 OS
const 디바이스나누기 = (d: string): { name: string; os: string | null } => {
  const [name, ...뒤] = d.split(' · ');
  return { name: name ?? d, os: 뒤.length > 0 ? 뒤.join(' · ') : null };
};

/** runId 를 안 주면 그 종류가 남은 가장 최근 실행이다. 그 실행에 안 남은 종류면 null(404) */
export async function 오류상세(e: 오류행, runId: number | null) {
  const pool = await db();
  const errorId = Number(e.id);
  const 이번 = (
    await pool.query<{ run_id: string; state: 상태; cases: number; hits: number; run_cases: number; day: string }>(
      `SELECT x.run_id, x.state, x.cases, x.hits, r.cases AS run_cases, to_char(r.day, 'YYYY-MM-DD') AS day
         FROM stab_run_error x JOIN stab_run r ON r.run_id = x.run_id
        WHERE x.error_id = $1 ${runId === null ? '' : 'AND x.run_id = $2'} ORDER BY x.run_id DESC LIMIT 1`,
      runId === null ? [errorId] : [errorId, runId],
    )
  ).rows[0];
  if (이번 === undefined) return null;
  const 번호 = Number(이번.run_id);
  const serviceId = Number(e.service_id);

  const [이전횟수, 발생, 견본, 추이, 기다림, 포기, 요약] = await Promise.all([
    pool
      .query<{ hits: number }>(
        `SELECT x.hits FROM stab_run_error x
          WHERE x.error_id = $1 AND x.run_id = (SELECT run_id FROM stab_run WHERE service_id = $2 AND env = $3 AND run_id < $4 ORDER BY run_id DESC LIMIT 1)`,
        [errorId, serviceId, e.env, 번호],
      )
      .then((r) => r.rows[0]?.hits ?? 0),
    pool.query<{ tc_id: string; name: string; status: string; seq: number | null; crash: boolean; history_id: string; run_id: string | null; device: string | null }>(
      `SELECT o.tc_id, COALESCE(i.tc_name, c.name, o.tc_id) AS name, o.item_status AS status, o.seq, o.crash, o.history_id, i.run_id, o.device
         FROM stab_occurrence o LEFT JOIN run_item i ON i.history_id = o.history_id LEFT JOIN test_case c ON c.tc_id = o.tc_id
        WHERE o.run_id = $1 AND o.error_id = $2 ORDER BY o.tc_id, o.history_id`,
      [번호, errorId],
    ),
    pool.query<{ text: string; page: string | null; device: string | null; run_id: string; tc_id: string; at: Date }>(
      'SELECT text, page, device, run_id, tc_id, at FROM stab_sample WHERE error_id = $1 ORDER BY ord',
      [errorId],
    ),
    pool.query<{ day: string; cases: number }>(
      `SELECT to_char(r.day, 'YYYY-MM-DD') AS day, COALESCE(x.cases, 0) AS cases
         FROM stab_run r LEFT JOIN stab_run_error x ON x.run_id = r.run_id AND x.error_id = $4
        WHERE r.service_id = $1 AND r.env = $2 AND r.day > $3::date - 7 AND r.day <= $3::date ORDER BY r.day, r.run_id`,
      [serviceId, e.env, 이번.day, errorId],
    ),
    pool.query(등록기다림SQL, [errorId]),
    // 마지막 등록이 포기됐으면 까닭을 보인다 — 다시 누를 수 있다 (BTS §3.12 「버그 바퀴」)
    pool.query<{ state: string; last_error: string | null }>(
      `SELECT state, last_error FROM bts_outbox WHERE kind = 'STAB_CREATE' AND (payload->>'stabErrorId')::bigint = $1 ORDER BY id DESC LIMIT 1`,
      [errorId],
    ),
    // 신규 · 증가 · 재발은 그 실행 요약, 기존은 그 종류가 든 가장 최근 요약 — 요약의 errors 에 이 번호가 든 일만 고른다 (§3.15 「상세의 AI 요약」)
    pool.query<{ run_id: string; output: unknown }>(
      `SELECT r.run_id, j.output FROM stab_run r JOIN perf_ai_job j ON j.id = r.ai_job_id
        WHERE r.service_id = $3 AND r.env = $4 AND j.status = 'DONE' AND r.run_id <= $2 ${이번.state === 'ONGOING' ? '' : 'AND r.run_id = $2'}
          AND j.output->'errors' @> jsonb_build_array(jsonb_build_object('errorId', $1::bigint))
        ORDER BY r.run_id DESC LIMIT 1`,
      [errorId, 번호, serviceId, e.env],
    ),
  ]);

  const 찾은 = 요약.rows[0] === undefined ? undefined : 요약읽기(요약.rows[0].output)?.errors.find((x) => x.errorId === errorId);
  const ai = 찾은 === undefined ? null : { headline: 찾은.headline, impact: 찾은.impact, previous: 찾은.previous, cause: 찾은.cause, runId: Number(요약.rows[0]!.run_id) };

  // 케이스 단위 — 한 케이스가 디바이스 · 반복으로 여러 항목이면 그 항목이 다 통과일 때만 「판정은 통과」다
  const 케이스판정 = new Map<string, boolean>();
  for (const o of 발생.rows) 케이스판정.set(o.tc_id, (케이스판정.get(o.tc_id) ?? true) && o.status === 'PASS');
  const 크래시케이스 = [...new Set(발생.rows.filter((o) => o.crash).map((o) => o.tc_id))].sort();
  const 디바이스별 = new Map<string, Set<string>>();
  for (const o of 발생.rows) if (o.device !== null) 디바이스별.set(o.device, (디바이스별.get(o.device) ?? new Set()).add(o.tc_id));

  const 바탕 = e.base_url?.replace(/\/+$/, '') ?? null;
  const 마지막 = 포기.rows[0];
  return {
    id: errorId,
    title: e.title,
    message: e.message,
    source: e.source,
    state: 이번.state,
    firstRunId: Number(e.first_run_id),
    firstDay: e.first_day,
    firstBuildNo: e.first_build_no,
    resolvedAt: e.resolved_at?.toISOString() ?? null,
    confirmedRunId: e.confirmed_run_id === null ? null : Number(e.confirmed_run_id),
    issue:
      e.issue_key !== null
        ? { key: e.issue_key, url: 바탕 === null ? null : `${바탕}/issues/${encodeURIComponent(e.issue_key)}` }
        : (기다림.rowCount ?? 0) > 0
          ? { state: 'PENDING' as const }
          : 마지막?.state === 'GAVE_UP'
            ? { state: 'GAVE_UP' as const, reason: 마지막.last_error }
            : null,
    // 프로젝트가 Issue Bunker 를 잇지 않았으면 화면이 등록 버튼을 숨긴다 (§3.15 「Issue Bunker 등록」)
    btsLinked: 바탕 !== null,
    ai,
    kpis: {
      cases: 이번.cases,
      runCases: 이번.run_cases,
      passCases: [...케이스판정.values()].filter(Boolean).length,
      crashCases: 크래시케이스.length,
      firstCrashTcId: 크래시케이스[0] ?? null,
      hits: 이번.hits,
      previousHits: 이전횟수,
    },
    runId: 번호,
    occurrences: 발생.rows.map((o) => ({
      tcId: o.tc_id,
      name: o.name,
      status: o.status,
      seq: o.seq,
      crash: o.crash,
      historyId: Number(o.history_id),
      // 그 항목이 실제로 돈 실행 — 묶음의 UI 실행일 수 있다. 실행 줄이 지워졌으면 null
      runId: o.run_id === null ? null : Number(o.run_id),
    })),
    samples: 견본.rows.map((s) => ({ text: s.text, page: s.page, device: s.device, runId: Number(s.run_id), tcId: s.tc_id, at: s.at.toISOString() })),
    trend: 추이.rows.map((r) => ({ day: r.day, cases: r.cases })),
    devices: [...디바이스별].map(([d, tcs]) => ({ ...디바이스나누기(d), cases: tcs.size })).sort((a, b) => b.cases - a.cases),
  };
}
