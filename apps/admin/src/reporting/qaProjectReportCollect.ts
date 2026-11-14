// 프로젝트 QA 리포트의 숫자를 모은다 — 기간 하나 · 프로젝트 전체 애플리케이션. 만든 때 이 값을 body 로 굳힌다 (도메인/리포팅 §3.17 「프로젝트 QA 리포트 — 기간 상태」)
// 기능 · UI 판정은 대시보드 집계(dashboardResults.ts)를, 애플리케이션 결과 요약은 애플리케이션 리포트 첫 장을 그대로 옮긴다 — 새로 세는 길을 두지 않는다.
// 예외는 비기능 품질 · 배포 · 결함 · 막힌 것이다 — 대시보드에 기간 셈이 없어 표를 직접 읽는다

import type { Pool } from 'pg';

import { 대시보드 } from './dashboardResults.js';
import { 날수, 다음기간, 회차수, type 앱리포트고리, type 앱줄, type 프로젝트몸 } from './qaProjectReportShape.js';

// 기간 시각 경계 — 그 시간대의 from 0시 이상, to 다음 날 0시 미만. 질의마다 $2 · $3 · $4 가 from · to · tz 다($1 은 질의마다 다르다)
const 시작 = `(($2::date)::timestamp AT TIME ZONE $4::text)`;
const 끝 = `(($3::date + 1)::timestamp AT TIME ZONE $4::text)`;
const 기간안 = (칸: string) => `${칸} >= ${시작} AND ${칸} < ${끝}`;
// 배포 목록은 이만큼만 굳힌다 — 수는 따로 센다
const 배포줄상한 = 50;

const 고리 = (r: { id: string; build_no: string | null; run_id: string | null; perf_run_id: string | null; version: number; approved: boolean }): 앱리포트고리 => ({
  id: Number(r.id),
  buildNo: r.build_no,
  runId: r.run_id === null ? null : Number(r.run_id),
  perfRunId: r.perf_run_id === null ? null : Number(r.perf_run_id),
  version: r.version,
  approved: r.approved,
});

/** 기간 안 애플리케이션 리포트 — 묶음마다 마지막 버전, 마지막 실행이 기간 안에 끝난 것. 마지막 실행 차례 */
async function 앱리포트들(pool: Pool, 값: unknown[]) {
  const r = await pool.query<{
    id: string; service_id: string; build_no: string | null; run_id: string | null; perf_run_id: string | null; version: number; approved: boolean;
    started: string | null; results: NonNullable<앱줄['last']>['results'];
    approved_id: string | null; approved_version: number | null;
  }>(
    `WITH 마지막 AS (
       SELECT DISTINCT ON (q.bundle_key) q.* FROM qa_report q WHERE q.service_id = ANY($1::bigint[]) ORDER BY q.bundle_key, q.version DESC)
     SELECT m.id, m.service_id, m.build_no, m.run_id, m.perf_run_id, m.version, m.approved_at IS NOT NULL AS approved,
            m.summary->'overview'->>'startedAt' AS started, m.summary->'results' AS results, 승.id AS approved_id, 승.version AS approved_version
       FROM 마지막 m
       -- 부록은 승인된 버전을 가리킨다 — 승인 뒤 다시 실행으로 버전 2(승인 전)가 섰어도 승인한 버전 1 이 기준 문서다 (§3.17 「프로젝트 QA 리포트」 부록)
       LEFT JOIN LATERAL (SELECT a.id, a.version FROM qa_report a WHERE a.bundle_key = m.bundle_key AND a.approved_at IS NOT NULL
                           ORDER BY a.version DESC LIMIT 1) 승 ON true
      WHERE ${기간안("COALESCE((m.summary->'overview'->>'finishedAt')::timestamptz, m.updated_at)")}
      ORDER BY COALESCE((m.summary->'overview'->>'finishedAt')::timestamptz, m.updated_at), m.id`,
    값,
  );
  return r.rows;
}

async function 커버리지(pool: Pool, 값: unknown[]) {
  // 기간 시작 때 값(그 앞 마지막 완료) 하나와 기간 안 완료 전부 — 대시보드 커버리지와 같은 작성 요청 칸이다
  const r = await pool.query<{ service_id: string; at: Date; cased: number; total: number; 앞: boolean }>(
    `SELECT * FROM (
       SELECT DISTINCT ON (service_id) service_id, finished_at AS at, coverage_cased AS cased, coverage_total AS total, true AS 앞
         FROM authoring_request
        WHERE service_id = ANY($1::bigint[]) AND status = 'DONE' AND kind IN ('AUTHOR', 'RERUN') AND coverage_total IS NOT NULL
          AND finished_at < ${시작}
        ORDER BY service_id, finished_at DESC, id DESC) 앞
     UNION ALL
     SELECT service_id, finished_at, coverage_cased, coverage_total, false
       FROM authoring_request
      WHERE service_id = ANY($1::bigint[]) AND status = 'DONE' AND kind IN ('AUTHOR', 'RERUN') AND coverage_total IS NOT NULL
        AND ${기간안('finished_at')}
     ORDER BY 2`,
    값,
  );
  return r.rows;
}

async function 비기능(pool: Pool, 값: unknown[]) {
  const [성능, 안정화, 오류] = await Promise.all([
    // 성능 목표 판정 수 — 판정이 난 실행만(도는 · 멈춘 측정은 반쪽 숫자다)
    pool.query<{ id: string; service_id: string; kind: 'LOAD' | 'PAGE' | 'DEVICE'; day: string; pass: number; fail: number }>(
      `SELECT r.id, r.service_id, r.kind, to_char((r.started_at AT TIME ZONE $4::text)::date, 'YYYY-MM-DD') AS day,
              (SELECT count(*) FROM jsonb_array_elements(COALESCE(r.targets, '[]')) t WHERE t->>'verdict' = 'PASS')::int AS pass,
              (SELECT count(*) FROM jsonb_array_elements(COALESCE(r.targets, '[]')) t WHERE t->>'verdict' = 'FAIL')::int AS fail
         FROM perf_run r
        WHERE r.service_id = ANY($1::bigint[]) AND r.verdict IS NOT NULL AND ${기간안('COALESCE(r.started_at, r.created_at)')}
        ORDER BY r.started_at, r.id`,
      값,
    ),
    // 날마다 대상 서버마다 마지막 집계 하나 — 하루 한 줄(안정화 §3.15 「일별 추이」). 대상 서버는 합친다
    pool.query<{ service_id: string; day: string; pass_error_cases: number; cases: number; crashes: number | null; residual: number }>(
      `SELECT service_id, to_char(day, 'YYYY-MM-DD') AS day, sum(pass_error_cases)::int AS pass_error_cases, sum(cases)::int AS cases,
              sum(crashes)::int AS crashes, sum(residual)::int AS residual
         FROM (SELECT DISTINCT ON (service_id, env, day) * FROM stab_run
                WHERE service_id = ANY($1::bigint[]) AND day BETWEEN $2::date AND $3::date ORDER BY service_id, env, day, run_id DESC) x
        GROUP BY service_id, day ORDER BY service_id, day`,
      값.slice(0, 3),
    ),
    pool.query<{ service_id: string; new_errors: number; reopened: number; confirmed: number }>(
      `SELECT r.service_id,
              (SELECT count(DISTINCT e.error_id) FROM stab_run_error e JOIN stab_run x ON x.run_id = e.run_id
                WHERE x.service_id = r.service_id AND x.day BETWEEN $2::date AND $3::date AND e.state = 'NEW')::int AS new_errors,
              (SELECT count(DISTINCT e.error_id) FROM stab_run_error e JOIN stab_run x ON x.run_id = e.run_id
                WHERE x.service_id = r.service_id AND x.day BETWEEN $2::date AND $3::date AND e.state = 'REOPENED')::int AS reopened,
              sum(r.confirmed)::int AS confirmed
         FROM stab_run r WHERE r.service_id = ANY($1::bigint[]) AND r.day BETWEEN $2::date AND $3::date GROUP BY r.service_id`,
      값.slice(0, 3),
    ),
  ]);
  return { 성능: 성능.rows, 안정화: 안정화.rows, 오류: 오류.rows };
}

/** 값 = [프로젝트, from, to, tz, 켜진 애플리케이션 번호들] — 꺼진 애플리케이션의 이슈는 안 센다 */
async function Bunker(pool: Pool, 값: unknown[]) {
  const 끝시각 = (await pool.query<{ t: Date }>(`SELECT (($1::date + 1)::timestamp AT TIME ZONE $2::text) AS t`, [값[2], 값[3]])).rows[0]!.t;
  const [배포, 변경, 결함날, 결함수, 열린] = await Promise.all([
    pool.query<{ build_no: string; at: Date; rollback: boolean }>(
      `SELECT build_no, created_at AS at, rollback FROM bts_deploy WHERE project_id = $1 AND ${기간안('created_at')} ORDER BY created_at`,
      값.slice(0, 4),
    ),
    // 변경 확인 — 기간 안 배포(롤백 빼고)에 든 이슈 가운데 「QA 요청」을 떠난(QA Hub 가 맡음을 놓은) 이슈
    pool.query<{ issues: number; confirmed: number }>(
      `SELECT count(DISTINCT c.issue_key)::int AS issues,
              count(DISTINCT c.issue_key) FILTER (WHERE c.released_at < ${끝})::int AS confirmed
         FROM bts_claim c JOIN bts_deploy d ON d.id = c.deploy_id
        WHERE d.project_id = $1 AND NOT d.rollback AND ${기간안('d.created_at')}`,
      값.slice(0, 4),
    ),
    // 날마다 그날 끝에 열린 이슈 — 한 이슈에 테스트가 여럿 붙어 키로 센다
    pool.query<{ day: string; open: number }>(
      `SELECT to_char(d, 'YYYY-MM-DD') AS day,
              (SELECT count(DISTINCT i.issue_key) FROM bts_issue_case i
                WHERE i.project_id = $1 AND i.service_id = ANY($5::bigint[]) AND i.created_at < ((d::date + 1)::timestamp AT TIME ZONE $4::text)
                  AND (i.closed_at IS NULL OR i.closed_at >= ((d::date + 1)::timestamp AT TIME ZONE $4::text)))::int AS open
         FROM generate_series($2::date - 1, $3::date, interval '1 day') AS g(d)
        ORDER BY d`,
      값,
    ),
    pool.query<{ opened: number; closed: number }>(
      `SELECT (SELECT count(DISTINCT issue_key) FROM bts_issue_case WHERE project_id = $1 AND service_id = ANY($5::bigint[]) AND ${기간안('created_at')})::int AS opened,
              (SELECT count(DISTINCT issue_key) FROM bts_issue_case WHERE project_id = $1 AND service_id = ANY($5::bigint[]) AND ${기간안('closed_at')})::int AS closed`,
      값,
    ),
    pool.query<{ service_id: string; n: number }>(
      `SELECT service_id, count(DISTINCT issue_key)::int AS n FROM bts_issue_case
        WHERE project_id = $1 AND created_at < $2::timestamptz AND (closed_at IS NULL OR closed_at >= $2::timestamptz)
        GROUP BY service_id`,
      // from 을 안 쓰는 질의다 — 안 쓰는 매개변수는 타입을 못 정해 거절되어 기간 끝 시각 하나만 넘긴다
      [값[0], 끝시각],
    ),
  ]);
  // 첫 줄은 기간 앞날 끝 — 기간 시작 때 열린 수다
  return { 배포: 배포.rows, 변경: 변경.rows[0]!, 결함시작: 결함날.rows[0]?.open ?? 0, 결함날: 결함날.rows.slice(1), 결함수: 결함수.rows[0]!, 열린: new Map(열린.rows.map((x) => [Number(x.service_id), x.n])) };
}

// 막힌 것은 실행 종류 넷 다 센다 — E2E · 호환성 실행이 멈춰도 그 기간 시험이 막힌 것이다 (§3.17 「QAR-F1-11 이 정한 것」 막힌 것)
const 막힘종류 = `('UI', 'FN', 'SCENARIO', 'COMPAT')`;

async function 막힘(pool: Pool, 값: unknown[]) {
  const r = await pool.query<{ service_id: string; aborted: number; prep_failed: number; perf_errors: number }>(
    `SELECT s.id AS service_id,
            (SELECT count(*) FROM test_run t WHERE t.service_id = s.id AND t.kind IN ${막힘종류} AND t.status = 'ABORTED' AND ${기간안('t.started_at')})::int AS aborted,
            (SELECT count(*) FROM test_run t WHERE t.service_id = s.id AND t.kind IN ${막힘종류} AND t.status = 'PREP_FAILED' AND ${기간안('t.started_at')})::int AS prep_failed,
            (SELECT count(*) FROM perf_run p WHERE p.service_id = s.id AND p.status = 'ERROR' AND ${기간안('COALESCE(p.started_at, p.created_at)')})::int AS perf_errors
       FROM service s WHERE s.id = ANY($1::bigint[]) ORDER BY s.id`,
    값,
  );
  return r.rows;
}

/**
 * 프로젝트 하나 · 기간 하나의 숫자. tz 는 pg_timezone_names 에 있는 이름이어야 한다(대시보드 집계가 본다 — 틀리면 틀린시간대).
 * 꺼진 애플리케이션은 담지 않는다 — 대시보드 · 목록이 안 보이는 애플리케이션이다
 */
export async function 프로젝트숫자(pool: Pool, projectId: number, 기간: { from: string; to: string; tz: string }, 앞리포트: 프로젝트몸['previous']): Promise<프로젝트몸> {
  const { from, to, tz } = 기간;
  const 프 = (await pool.query<{ name: string; bts: boolean }>('SELECT p.name, EXISTS (SELECT 1 FROM bts_link l WHERE l.project_id = p.id) AS bts FROM project p WHERE p.id = $1', [projectId])).rows[0];
  if (프 === undefined) throw new Error(`프로젝트 ${String(projectId)} 가 없다`);
  const 앱들 = (
    await pool.query<{ id: string; prefix: string; name: string; kind: 앱줄['kind'] }>('SELECT id, prefix, name, kind FROM service WHERE project_id = $1 AND is_active ORDER BY id', [projectId])
  ).rows.map((s) => ({ id: Number(s.id), prefix: s.prefix, name: s.name, kind: s.kind }));
  const ids = 앱들.map((s) => s.id);
  const 값 = [ids, from, to, tz];
  const n = 날수(from, to);

  const [판정, 리포트들, 커버, 비, 벙커, 막힌, 세트들] = await Promise.all([
    대시보드(tz, ids, [], { 날수: n, 끝: to }),
    앱리포트들(pool, 값),
    커버리지(pool, 값),
    비기능(pool, 값),
    프.bts ? Bunker(pool, [projectId, from, to, tz, ids]) : null,
    막힘(pool, 값),
    pool.query<{ name: string; at: string; tz: string; days: number[] | null; once_on: string | null }>(
      `SELECT name, to_char(at, 'HH24:MI') AS at, tz, days, to_char(once_on, 'YYYY-MM-DD') AS once_on FROM sched_set WHERE project_id = $1 AND is_on ORDER BY at, name`,
      [projectId],
    ),
  ]);

  const 서비스판정 = new Map(판정.byService.map((s) => [s.serviceId, s]));
  const 다음 = 다음기간(from, to);
  const apps = 앱들.map((s): 앱줄 => {
    const 내것 = 리포트들.filter((r) => Number(r.service_id) === s.id);
    const 마지막 = 내것.at(-1);
    const 판 = 서비스판정.get(s.id);
    return {
      serviceId: s.id,
      prefix: s.prefix,
      name: s.name,
      kind: s.kind,
      runs: 판?.current ?? { pass: 0, fail: 0, notRun: 0 },
      newFailures: 판?.newFailureCount ?? 0,
      resolved: 판?.resolvedCount ?? 0,
      builds: [...내것].sort((a, b) => (a.started ?? '').localeCompare(b.started ?? '')).flatMap((r) => (r.build_no === null ? [] : [r.build_no])),
      reports: 내것.length,
      unapproved: 내것.filter((r) => !r.approved).length,
      last: 마지막 === undefined ? null : { ...고리(마지막), results: 마지막.results },
      openDefects: 벙커 === null ? null : (벙커.열린.get(s.id) ?? 0),
    };
  });

  return {
    project: { id: projectId, name: 프.name },
    period: { from, to, tz, days: n },
    btsLinked: 프.bts,
    apps,
    passRate: 판정.passRate,
    daily: 판정.daily.map(({ day, pass, fail, notRun }) => ({ day, pass, fail, notRun })),
    deploys:
      벙커 === null
        ? null
        : {
            count: 벙커.배포.length,
            rollbacks: 벙커.배포.filter((d) => d.rollback).length,
            items: 벙커.배포.slice(-배포줄상한).map((d) => ({ buildNo: d.build_no, at: d.at.toISOString(), rollback: d.rollback })),
          },
    changes: 벙커 === null ? null : 벙커.변경,
    coverage: 앱들
      .filter((s) => s.kind !== 'API' || 커버.some((c) => Number(c.service_id) === s.id))
      .map((s) => {
        const 내것 = 커버.filter((c) => Number(c.service_id) === s.id);
        const 점 = (c: (typeof 커버)[number]) => ({ at: c.at.toISOString(), cased: c.cased, total: c.total });
        const 앞 = 내것.find((c) => c.앞);
        return { serviceId: s.id, name: s.name, start: 앞 === undefined ? null : 점(앞), points: 내것.filter((c) => !c.앞).map(점) };
      }),
    defects: 벙커 === null ? null : { opened: 벙커.결함수.opened, closed: 벙커.결함수.closed, start: 벙커.결함시작, days: 벙커.결함날 },
    nonFunctional: 앱들.map((s) => {
      const 하루들 = 비.안정화.filter((x) => Number(x.service_id) === s.id);
      const 오류 = 비.오류.find((x) => Number(x.service_id) === s.id);
      return {
        serviceId: s.id,
        name: s.name,
        kind: s.kind,
        perf: 비.성능.filter((p) => Number(p.service_id) === s.id).map((p) => ({ runId: Number(p.id), day: p.day, kind: p.kind, pass: p.pass, fail: p.fail })),
        stab:
          하루들.length === 0
            ? null
            : {
                days: 하루들.map((x) => ({ day: x.day, passErrorCases: x.pass_error_cases, cases: x.cases, crashes: x.crashes, residual: x.residual })),
                newErrors: 오류?.new_errors ?? 0,
                reopened: 오류?.reopened ?? 0,
                confirmed: 오류?.confirmed ?? 0,
              },
      };
    }),
    blocked: 막힌
      .filter((x) => x.aborted + x.prep_failed + x.perf_errors > 0)
      .map((x) => ({ serviceId: Number(x.service_id), name: 앱들.find((s) => s.id === Number(x.service_id))?.name ?? '', aborted: x.aborted, prepFailed: x.prep_failed, perfErrors: x.perf_errors })),
    upcoming: {
      ...다음,
      sets: 세트들.rows
        .map((x) => ({ name: x.name, at: x.at, tz: x.tz, days: x.days, onceOn: x.once_on, runs: 회차수({ days: x.days, onceOn: x.once_on }, 다음.from, 다음.to) }))
        .filter((x) => x.runs > 0),
    },
    appendix: 앱들
      .map((s) => ({
        serviceId: s.id,
        name: s.name,
        reports: 리포트들
          .filter((r) => Number(r.service_id) === s.id)
          .map((r) => (r.approved_id === null ? 고리(r) : { ...고리(r), id: Number(r.approved_id), version: r.approved_version ?? r.version, approved: true })),
      }))
      .filter((a) => a.reports.length > 0),
    previous: 앞리포트,
  };
}
