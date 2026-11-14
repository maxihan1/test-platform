// QA 리포트 첫 장의 기능 검증 재료 — 기능 · UI · E2E 판정 셈, 계획 대비 차이의 케이스 쪽, 실패 분류 (도메인/리포팅 §3.17)

import type { Pool } from 'pg';

import { tcId종류 } from '../catalog/rules.js';
import { 지금항목 } from '../execution/single.js';
import { 미확정SQL, 접은판정SQL } from '../scenario/verdict.js';
import { 판정들 } from './failReqs.js';
import { 원인을가른다, type 원인 } from './failureType.js';

export interface 판정셈 {
  pass: number;
  fail: number;
  notRun: number;
  unconfirmed: number;
}

export type 실패갈래 = 'PRODUCT' | 'TEST' | 'ENV' | 'UNCLASSIFIED';

export interface 실패줄 {
  kind: 'FN' | 'UI' | 'E2E';
  tcId: string;
  platform: string | null;
  runId: number;
  class: 실패갈래;
  /** 무엇이 갈랐나 — 사람 판정 · Issue Bunker 이슈 · 원인 규칙. 미분류는 null */
  by: 'PERSON' | 'ISSUE' | 'RULE' | null;
  issueKey: string | null;
}

export interface 케이스계획 {
  kind: 'FN' | 'UI';
  /** 그 애플리케이션의 활성 케이스 수 — 만든 때 읽어 굳힌다 */
  planned: number;
  ran: number;
  notIncluded: { tcId: string; name: string }[];
  notRun: { tcId: string; name: string; platform: string; cause: 원인 }[];
}

export interface 기능재료 {
  results: { FN: 판정셈 | null; UI: 판정셈 | null; E2E: 판정셈 | null };
  plan: 케이스계획[];
  /** 이번 묶음에서 돈 시나리오 번호 — 계획 대비 차이의 E2E 쪽이 쓴다 */
  scenarioIds: number[];
  failures: 실패줄[];
}

interface 접은행 {
  run_id: string;
  kind: 'FN' | 'UI';
  tc_id: string;
  platform: string;
  tc_name: string;
  verdict: 'PASS' | 'FAIL' | 'NA';
  unconfirmed: boolean;
  rep: string | null;
  rep_message: string | null;
}

// 같은 케이스 × 디바이스가 묶음의 여러 실행에 들면 가장 늦게 시작한 실행 것이 이 빌드의 결과다(다시 돌린 결과가 앞 결과를 덮는다).
// 실행 안의 회차는 대시보드와 같이 접는다(reporting/dashboardSql.ts — 전부 통과 · 하나라도 실패 · 나머지 미실행).
// 한 건 실행은 붙은 실행과 빌드가 같을 때만 덮는다 — 다음 빌드에서 고쳐진 결과가 앞 빌드에 「통과」로 들면 안 된다 (§3.17 「묶음 · 버전」)
const 접기SQL = `
  WITH 항목 AS (
    SELECT r.run_id, r.kind, r.started_at, i.tc_id, i.tc_name, i.platform, i.status, i.unconfirmed, i.history_id, i.error
      FROM test_run r
      JOIN LATERAL ${지금항목('o.run_id = r.run_id', ' AND sr.build_no IS NOT DISTINCT FROM r.build_no')} i ON true
     WHERE r.run_id = ANY($1::bigint[]) AND r.kind IN ('UI', 'FN')
  ), 고른 AS (
    SELECT DISTINCT ON (kind, tc_id, platform) run_id, kind, tc_id, platform
      FROM 항목 ORDER BY kind, tc_id, platform, started_at DESC, run_id DESC
  )
  SELECT h.run_id, h.kind, h.tc_id, h.platform, max(h.tc_name) AS tc_name,
         ${접은판정SQL('h')} AS verdict, bool_or(h.unconfirmed IS NOT NULL) AS unconfirmed,
         (array_agg(h.history_id ORDER BY h.status = 'FAIL' DESC, h.history_id) FILTER (WHERE h.status <> 'PASS'))[1] AS rep,
         (array_agg(COALESCE(h.error->>'message', '') ORDER BY h.status = 'FAIL' DESC, h.history_id) FILTER (WHERE h.status <> 'PASS'))[1] AS rep_message
    FROM 고른 g JOIN 항목 h USING (run_id, kind, tc_id, platform)
   GROUP BY h.run_id, h.kind, h.tc_id, h.platform
   ORDER BY h.kind, h.tc_id, h.platform`;

// 원인 규칙의 재료 — 대시보드 원인식과 같은 값(확인 문장 실패 · 첫 절차 오류)이다
const 절차SQL = `
  SELECT h AS history_id,
         EXISTS (SELECT 1 FROM run_item_step s CROSS JOIN LATERAL jsonb_array_elements(s.assertions) AS a(value)
                  WHERE s.history_id = h AND a.value->>'status' = 'FAIL') AS assert_failed,
         COALESCE((SELECT s.error->>'message' FROM run_item_step s WHERE s.history_id = h AND s.error IS NOT NULL ORDER BY s.seq LIMIT 1), '') AS step_message
    FROM unnest($1::bigint[]) AS h`;

const 빈셈 = (): 판정셈 => ({ pass: 0, fail: 0, notRun: 0, unconfirmed: 0 });

function 더한다(셈: 판정셈, verdict: 'PASS' | 'FAIL' | 'NA', unconfirmed: boolean): void {
  if (verdict === 'PASS') 셈.pass += 1;
  else if (verdict === 'FAIL') 셈.fail += 1;
  else 셈.notRun += 1;
  if (unconfirmed) 셈.unconfirmed += 1;
}

export interface 묶음재료 {
  serviceId: number;
  prefix: string;
  env: string;
  runIds: number[];
  /** 묶음 첫 실행 시작 — 그 전에 닫힌 Issue Bunker 이슈는 이 빌드의 판정이 아니다 */
  firstStartedAt: Date;
}

export async function 기능재료읽기(pool: Pool, 묶음: 묶음재료): Promise<기능재료> {
  const 접은 = (await pool.query<접은행>(접기SQL, [묶음.runIds])).rows;
  const 대표들 = 접은.flatMap((r) => (r.rep === null ? [] : [Number(r.rep)]));
  const 절차 = new Map(
    (await pool.query<{ history_id: string; assert_failed: boolean; step_message: string }>(절차SQL, [대표들])).rows.map((r) => [Number(r.history_id), r]),
  );
  const 원인들 = new Map<접은행, 원인>();
  for (const r of 접은) {
    if (r.verdict === 'PASS' || r.rep === null) continue;
    const s = 절차.get(Number(r.rep));
    원인들.set(r, 원인을가른다({ status: r.verdict, assertFailed: s?.assert_failed ?? false, itemMessage: r.rep_message ?? '', stepMessage: s?.step_message ?? '' }));
  }

  const results: 기능재료['results'] = { FN: null, UI: null, E2E: null };
  for (const r of 접은) 더한다((results[r.kind] ??= 빈셈()), r.verdict, r.unconfirmed);

  const e2e = (
    await pool.query<{ run_id: string; scenario_id: string; verdict: 'PASS' | 'FAIL' | 'NA'; unconfirmed: boolean }>(
      `WITH 고른 AS (
         SELECT DISTINCT ON (scenario_id) run_id, scenario_id FROM test_run
          WHERE run_id = ANY($1::bigint[]) AND kind = 'SCENARIO' ORDER BY scenario_id, started_at DESC, run_id DESC)
       SELECT g.run_id, g.scenario_id, ${접은판정SQL('p')} AS verdict, ${미확정SQL('p')} AS unconfirmed
         FROM 고른 g LEFT JOIN scenario_run_part p ON p.run_id = g.run_id
        GROUP BY g.run_id, g.scenario_id`,
      [묶음.runIds],
    )
  ).rows;
  for (const r of e2e) 더한다((results.E2E ??= 빈셈()), r.verdict, r.unconfirmed);

  // 계획 — 이번 빌드 때 그 애플리케이션의 활성 케이스. 종류는 번호 꼴로 가른다(catalog/rules.ts tcId종류)
  const 활성 = (await pool.query<{ tc_id: string; name: string }>('SELECT tc_id, name FROM test_case WHERE tc_id LIKE $1 AND is_active ORDER BY tc_id', [`${묶음.prefix}-%`])).rows;
  const plan = (['FN', 'UI'] as const).map((kind): 케이스계획 => {
    const 돈 = new Set(접은.filter((r) => r.kind === kind).map((r) => r.tc_id));
    const 계획 = 활성.filter((c) => tcId종류(c.tc_id) === kind);
    return {
      kind,
      planned: 계획.length,
      ran: 돈.size,
      notIncluded: 계획.filter((c) => !돈.has(c.tc_id)).map((c) => ({ tcId: c.tc_id, name: c.name })),
      notRun: 접은
        .filter((r) => r.kind === kind && r.verdict === 'NA')
        .map((r) => ({ tcId: r.tc_id, name: r.tc_name, platform: r.platform, cause: 원인들.get(r) ?? 'other' })),
    };
  });

  // 실패 분류 대상 — 통과 못 한 케이스 × 디바이스. 멈춤 · 준비 실패로 안 돈 것은 판정이 아니라 계획 대비 차이(미실행 사유)에 선다.
  // E2E 는 실패한 케이스 부품만 — 앞 부품이 깨져 안 돈 부품(NA)까지 세면 한 실패가 여러 건이 된다
  const 대상: (Omit<실패줄, 'class' | 'by' | 'issueKey'> & { 환경: boolean })[] = 접은
    .filter((r) => r.verdict !== 'PASS' && 원인들.get(r) !== 'stopped')
    .map((r) => ({ kind: r.kind, tcId: r.tc_id, platform: r.platform, runId: Number(r.run_id), 환경: 원인들.get(r) === 'environment' }));
  const 부품 = (
    await pool.query<{ run_id: string; tc_id: string; message: string }>(
      `SELECT p.run_id, p.tc_id, COALESCE(p.error->>'message', '') AS message FROM scenario_run_part p
        WHERE p.run_id = ANY($1::bigint[]) AND p.kind = 'case' AND p.status = 'FAIL' ORDER BY p.run_id, p.seq`,
      [e2e.map((r) => Number(r.run_id))],
    )
  ).rows;
  for (const p of 부품) {
    const 원인 = 원인을가른다({ status: 'FAIL', assertFailed: false, itemMessage: p.message, stepMessage: '' });
    대상.push({ kind: 'E2E', tcId: p.tc_id, platform: null, runId: Number(p.run_id), 환경: 원인 === 'environment' });
  }

  return { results, plan, scenarioIds: e2e.map((r) => Number(r.scenario_id)), failures: await 가른다(pool, 묶음, 대상) };
}

/** 사람 판정 → Issue Bunker 이슈 → 원인 규칙 차례로 넷 중 하나 (§3.17 「실패 분류」). AI 는 가르지 않는다 */
async function 가른다(pool: Pool, 묶음: 묶음재료, 대상: (Omit<실패줄, 'class' | 'by' | 'issueKey'> & { 환경: boolean })[]): Promise<실패줄[]> {
  if (대상.length === 0) return [];
  const 실행별 = new Map<number, string[]>();
  for (const d of 대상) 실행별.set(d.runId, [...(실행별.get(d.runId) ?? []), d.tcId]);
  const 사람 = new Map<string, '결함' | '화면'>();
  for (const [runId, tcIds] of 실행별) {
    for (const [tcId, p] of await 판정들(runId, [...new Set(tcIds)])) if (p !== null) 사람.set(`${runId}:${tcId}`, p.kind === 'BUG' ? '결함' : '화면');
  }
  // 열린 이슈, 아니면 이 빌드가 시작한 뒤 닫힌 이슈 — 오래전에 고쳐 닫은 이슈가 오늘 실패를 가르면 안 된다
  const 이슈 = new Map(
    (
      await pool.query<{ tc_id: string; issue_key: string; closed_at: Date | null; resolution: string | null }>(
        `SELECT DISTINCT ON (tc_id) tc_id, issue_key, closed_at, resolution FROM bts_issue_case
          WHERE service_id = $1 AND env = $2 AND tc_id = ANY($3) AND (closed_at IS NULL OR closed_at >= $4)
          ORDER BY tc_id, (closed_at IS NULL) DESC, created_at DESC`,
        [묶음.serviceId, 묶음.env, [...new Set(대상.map((d) => d.tcId))], 묶음.firstStartedAt],
      )
    ).rows.map((r) => [r.tc_id, r]),
  );
  return 대상.map(({ 환경, ...d }): 실패줄 => {
    const p = 사람.get(`${d.runId}:${d.tcId}`);
    if (p !== undefined) return { ...d, class: p === '결함' ? 'PRODUCT' : 'TEST', by: 'PERSON', issueKey: null };
    const i = 이슈.get(d.tcId);
    // DUPLICATE 는 판정이 아니라 이슈 정리다 — 원래 이슈를 몰라 규칙으로 넘긴다
    if (i !== undefined && i.resolution !== 'DUPLICATE') {
      const 갈래: 실패갈래 =
        i.closed_at === null || i.resolution === 'FIXED' ? 'PRODUCT' : i.resolution === 'ENV' ? 'ENV' : i.resolution === null ? 'UNCLASSIFIED' : 'TEST';
      if (갈래 !== 'UNCLASSIFIED') return { ...d, class: 갈래, by: 'ISSUE', issueKey: i.issue_key };
    }
    return 환경 ? { ...d, class: 'ENV', by: 'RULE', issueKey: null } : { ...d, class: 'UNCLASSIFIED', by: null, issueKey: null };
  });
}
