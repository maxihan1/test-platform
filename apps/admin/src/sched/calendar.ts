// 정기 실행 달력 · 세트 카드의 지난 결과 · 담을 후보 읽기 (도메인/정기실행 §7 「calendar」 · 「candidates」 · 세트줄 avgMinutes · last)

import type { ScenarioPart } from '@platform/kit';

import { 호환성요약들 } from '../compat/runView.js';
import { pool } from '../db/index.js';
import { 쓰는접두사 } from '../scenario/mixed.js';
import { 접은판정SQL } from '../scenario/verdict.js';
import type { 앱 } from './check.js';
import { 실행가능붙이기 } from './store.js';

export interface 회차실행 {
  runId: number;
  kind: 'UI' | 'FN' | 'SCENARIO' | 'COMPAT';
  service: string;
  title: string;
  status: string;
  passed: number;
  failed: number;
  other: number;
  suspects?: number;
}

type 판정 = 'PASS' | 'FAIL' | 'NONE';

/**
 * 회차가 만든 실행들. 한 회차가 여러 종류를 만들어 종류를 거르지 않는다(§3.16 「실행 만들기」 아래 — 「훑는 조회는 kind 를 건다」의 예외).
 * E2E 는 시나리오 하나가 테스트 하나라 접은 판정 하나로 센다. 호환성은 통과 · 실패를 안 세고 의심 화면(미판정 + 결함 확정)만 싣는다
 */
async function 회차실행들(회차번호: readonly number[]): Promise<Map<number, 회차실행[]>> {
  const r = await pool.query<{ run_id: string; occ: string; kind: 회차실행['kind']; prefix: string | null; title: string; status: string; passed: number; failed: number; total: number; verdict: string | null }>(
    `SELECT r.run_id, r.sched_occurrence_id AS occ, r.kind, s.prefix, r.title, r.status,
            COALESCE(i.passed, 0)::int AS passed, COALESCE(i.failed, 0)::int AS failed, COALESCE(i.total, 0)::int AS total, p.verdict
       FROM test_run r
       LEFT JOIN service s ON s.id = r.service_id
       LEFT JOIN LATERAL (SELECT count(*) FILTER (WHERE status = 'PASS') AS passed, count(*) FILTER (WHERE status = 'FAIL') AS failed, count(*) AS total
                            FROM run_item WHERE run_id = r.run_id) i ON r.kind IN ('UI','FN')
       LEFT JOIN LATERAL (SELECT ${접은판정SQL('x')} AS verdict FROM scenario_run_part x WHERE x.run_id = r.run_id) p ON r.kind = 'SCENARIO'
      WHERE r.sched_occurrence_id = ANY($1::bigint[])
      ORDER BY r.run_id`,
    [회차번호],
  );
  // ponytail: 의심 화면 수 하나를 얻으려고 호환성 결과를 실행마다 다 센다 — 달력이 느려지면 칸 판정을 집계 쿼리 하나로 옮긴다
  const 호환 = await 호환성요약들(r.rows.filter((x) => x.kind === 'COMPAT').map((x) => Number(x.run_id)));
  const 표 = new Map<number, 회차실행[]>();
  for (const x of r.rows) {
    const runId = Number(x.run_id);
    const 셈 =
      x.kind === 'SCENARIO'
        ? { passed: x.verdict === 'PASS' ? 1 : 0, failed: x.verdict === 'FAIL' ? 1 : 0, other: x.verdict === 'PASS' || x.verdict === 'FAIL' ? 0 : 1 }
        : { passed: x.passed, failed: x.failed, other: x.total - x.passed - x.failed };
    const 요약 = 호환.get(runId);
    const 줄: 회차실행 = { runId, kind: x.kind, service: x.prefix ?? '', title: x.title, status: x.status, ...셈, ...(x.kind === 'COMPAT' && { suspects: (요약?.confirmed ?? 0) + (요약?.pending ?? 0) }) };
    표.set(Number(x.occ), [...(표.get(Number(x.occ)) ?? []), 줄]);
  }
  return 표;
}

/**
 * 회차의 결과 — 기능 · UI · E2E 실행에 실패가 하나라도 있으면 FAIL, 판정할 실행이 없으면 NONE (§3.16 「회차의 결과」).
 * 통과도 실패도 없는 실행(러너가 죽어 항목이 다 NA · 판정 안 된 E2E)은 판정할 실행으로 안 센다 — 그것만으로 「통과」가 되지 않게
 */
const 회차판정 = (runs: readonly 회차실행[]): 판정 => {
  const 판정할 = runs.filter((x) => x.kind !== 'COMPAT' && x.passed + x.failed > 0);
  if (판정할.length === 0) return 'NONE';
  return 판정할.some((x) => x.failed > 0) ? 'FAIL' : 'PASS';
};
const 의심수 = (runs: readonly 회차실행[]) => runs.reduce((n, x) => n + (x.suspects ?? 0), 0);

/** 달력 — 기간 안 프로젝트 세트들의 회차. 앞으로의 예정은 화면이 세트줄로 그린다 */
export async function 회차들(projectId: number, from: string, to: string) {
  const r = await pool.query<{ id: string; set_id: string; planned_on: string; planned_at: Date; started_at: Date | null; finished_at: Date | null; state: string; notes: unknown[] }>(
    `SELECT o.id, o.set_id, to_char(o.planned_on, 'YYYY-MM-DD') AS planned_on, o.planned_at, o.started_at, o.finished_at, o.state, o.notes
       FROM sched_occurrence o JOIN sched_set s ON s.id = o.set_id
      WHERE s.project_id = $1 AND o.planned_on BETWEEN $2::date AND $3::date
      ORDER BY o.planned_at, o.set_id`,
    [projectId, from, to],
  );
  const 실행 = await 회차실행들(r.rows.map((x) => Number(x.id)));
  return r.rows.map((x) => {
    const runs = 실행.get(Number(x.id)) ?? [];
    return {
      id: Number(x.id),
      setId: Number(x.set_id),
      plannedOn: x.planned_on,
      plannedAt: x.planned_at.toISOString(),
      startedAt: x.started_at?.toISOString() ?? null,
      finishedAt: x.finished_at?.toISOString() ?? null,
      state: x.state,
      verdict: 회차판정(runs),
      suspects: 의심수(runs),
      runs,
      notes: x.notes,
    };
  });
}

export interface 지난결과 {
  avgMinutes: number | null;
  last: { occurrenceId: number; state: 'RUNNING' | 'DONE'; plannedAt: string; startedAt: string | null; verdict: 판정; suspects: number; runIds: number[] } | null;
}

/** 세트마다 끝난 회차 최근 다섯의 평균 시간과 마지막 회차(도는 중 포함) — 달력 대기 예상 · 마법사 겹침 안내 · 세트 카드 */
export async function 지난결과들(setIds: readonly number[]): Promise<Map<number, 지난결과>> {
  const [평균, 마지막] = await Promise.all([
    pool.query<{ set_id: string; avg: number }>(
      `SELECT set_id, round(avg(extract(epoch FROM finished_at - started_at)) / 60)::int AS avg
         FROM (SELECT set_id, started_at, finished_at, row_number() OVER (PARTITION BY set_id ORDER BY planned_at DESC) AS n
                 FROM sched_occurrence
                WHERE set_id = ANY($1::bigint[]) AND state = 'DONE' AND started_at IS NOT NULL AND finished_at IS NOT NULL) x
        WHERE n <= 5 GROUP BY set_id`,
      [setIds],
    ),
    pool.query<{ id: string; set_id: string; state: 'RUNNING' | 'DONE'; planned_at: Date; started_at: Date | null }>(
      `SELECT DISTINCT ON (set_id) id, set_id, state, planned_at, started_at FROM sched_occurrence
        WHERE set_id = ANY($1::bigint[]) AND state IN ('RUNNING','DONE') ORDER BY set_id, planned_at DESC`,
      [setIds],
    ),
  ]);
  const 실행 = await 회차실행들(마지막.rows.map((x) => Number(x.id)));
  const 평균표 = new Map(평균.rows.map((x) => [Number(x.set_id), x.avg]));
  const 마지막표 = new Map(마지막.rows.map((x) => [Number(x.set_id), x]));
  return new Map(setIds.map((id) => {
    const o = 마지막표.get(id);
    const runs = o === undefined ? [] : (실행.get(Number(o.id)) ?? []);
    return [id, {
      avgMinutes: 평균표.get(id) ?? null,
      last: o === undefined ? null : { occurrenceId: Number(o.id), state: o.state, plannedAt: o.planned_at.toISOString(), startedAt: o.started_at?.toISOString() ?? null, verdict: 회차판정(runs), suspects: 의심수(runs), runIds: runs.map((x) => x.runId) },
    }];
  }));
}

/** 마법사가 담을 후보 — 애플리케이션별 활성 케이스 수 · 프로젝트 전체 E2E 시나리오 · 호환성 세트 (§7 「candidates」) */
export async function 후보들(projectId: number) {
  const [앱, 시, 호] = await Promise.all([
    // UI 번호 꼴은 catalog/rules.ts tcId종류 와 같은 뜻이다
    pool.query<{ id: string; prefix: string; name: string; kind: 앱['kind']; fn: number; ui: number }>(
      `SELECT s.id, s.prefix, s.name, s.kind,
              count(c.tc_id) FILTER (WHERE c.tc_id !~ '-UI-[0-9]{3}$')::int AS fn,
              count(c.tc_id) FILTER (WHERE c.tc_id ~ '-UI-[0-9]{3}$')::int AS ui
         FROM service s LEFT JOIN test_case c ON c.tc_id LIKE s.prefix || '-%' AND c.is_active
        WHERE s.project_id = $1 AND s.is_active
        GROUP BY s.id ORDER BY s.prefix`,
      [projectId],
    ),
    pool.query<{ id: string; name: string; service_id: string; prefix: string; parts: ScenarioPart[] }>(
      `SELECT sc.id, sc.name, sc.service_id, s.prefix, v.parts FROM scenario sc
         JOIN service s ON s.id = sc.service_id
         JOIN LATERAL (SELECT parts FROM scenario_version WHERE scenario_id = sc.id ORDER BY version DESC LIMIT 1) v ON true
        WHERE s.project_id = $1 AND s.is_active AND sc.is_active ORDER BY sc.id`,
      [projectId],
    ),
    pool.query<{ id: string; name: string; prefix: string }>(
      `SELECT c.id, c.name, s.prefix FROM compat_set c JOIN service s ON s.id = c.service_id
        WHERE s.project_id = $1 AND s.is_active AND c.is_active ORDER BY c.id`,
      [projectId],
    ),
  ]);
  const 앱들 = new Map(앱.rows.map((x) => [Number(x.id), { id: Number(x.id), prefix: x.prefix, name: x.name, kind: x.kind, isActive: true, projectId }]));
  const 가능 = await 실행가능붙이기(projectId, 앱들, 시.rows.map((x) => ({ id: Number(x.id), serviceId: Number(x.service_id), isActive: true, name: x.name, parts: x.parts })));
  return {
    services: 앱.rows.map((x) => ({ prefix: x.prefix, name: x.name, kind: x.kind, fn: x.fn, ui: x.ui })),
    scenarios: 시.rows.map((x) => ({ id: Number(x.id), name: x.name, service: x.prefix, path: 쓰는접두사(x.parts, x.prefix), runnable: 가능.get(Number(x.id))?.runnable ?? false })),
    compatSets: 호.rows.map((x) => ({ id: Number(x.id), name: x.name, service: x.prefix })),
  };
}
