// QA 리포트 첫 장 숫자 — 개요 · 결과 요약(기능 검증 · 비기능 검증) · 안정화 줄 · 계획 대비 차이 · 실패 분류 · 이전 빌드를 세어 만든 때 굳힌다 (도메인/리포팅 §3.17)

import type { Pool } from 'pg';

import { 기능재료읽기, type 실패갈래, type 실패줄, type 케이스계획, type 판정셈 } from './qaReportCases.js';
import { 변경사항을센다, type 변경사항 } from './qaReportChanges.js';

export type 리포트종류 = 'FN' | 'UI' | 'E2E' | 'COMPAT' | 'PERF';
/** 출처별 발생 케이스. 게임의 크래시는 logcat 의 크래시 · ANR 을 합친 것이다(안정화 §3.15 결정 14) */
export type 안정화출처 = 'WEB_PAGEERROR' | 'WEB_CONSOLE' | 'WEB_NETWORK' | 'APP_CRASH' | 'APP_ANR' | 'GAME_EXCEPTION' | 'GAME_CRASH';

export interface 안정화줄 {
  /** 셈한 집계 줄의 날짜 — 이 버전이 담은 정기 실행의 마지막 줄 */
  day: string;
  /** 이 버전이 담은 집계 줄 수. 1 보다 크면 「K일 중 마지막 날 기준」 */
  days: number;
  passErrorCases: number;
  cases: number;
  sources: { source: 안정화출처; cases: number }[];
  residual: number;
  newErrors: number;
  reopened: number;
  confirmed: number;
}

export interface 첫장 {
  kinds: 리포트종류[];
  overview: {
    serviceName: string;
    env: string;
    baseUrl: string;
    buildNo: string | null;
    testsRepo: string | null;
    startedAt: string;
    finishedAt: string | null;
    performers: { username: string; name: string }[];
    runs: number;
    /** 묶음에 아직 도는 실행 — 개요의 「진행 중인 실행 N개」 */
    running: number;
  };
  results: {
    functional: { kind: 'FN' | 'UI' | 'E2E'; result: 판정셈 | null }[];
    nonFunctional: (
      | { kind: 'COMPAT'; quality: 'COMPATIBILITY'; result: { devices: number; screens: number; suspect: number } | null }
      | { kind: 'PERF'; quality: 'PERFORMANCE_EFFICIENCY'; result: { runs: number; pass: number; fail: number } | null }
      | { kind: 'STAB'; quality: 'RELIABILITY'; result: 안정화줄 | null }
    )[];
  };
  plan: { cases: 케이스계획[]; e2e: string[]; compat: string[]; perf: string[] };
  failures: { counts: Record<실패갈래, number>; items: 실패줄[] };
  previous: { buildNo: string; reportId: number | null } | null;
  /** 빌드 없는 리포트는 null — 변경 사항 절을 그리지 않는다 */
  changes: 변경사항 | null;
}

export interface 묶음 {
  serviceId: number;
  prefix: string;
  serviceKind: 'SCREEN' | 'APP' | 'GAME' | 'API';
  env: string;
  buildNo: string | null;
  runIds: number[];
  perfRunIds: number[];
  running: number;
}

const 출처차례: Record<묶음['serviceKind'], 안정화출처[]> = {
  SCREEN: ['WEB_PAGEERROR', 'WEB_CONSOLE', 'WEB_NETWORK'],
  APP: ['APP_CRASH', 'APP_ANR'],
  GAME: ['GAME_EXCEPTION', 'GAME_CRASH'],
  API: [],
};

/** 같은 애플리케이션 · 대상 서버에서 이 빌드 바로 앞 빌드 — 빌드 번호 차례가 아니라 첫 실행 시각 차례다 (§3.17 「변경 사항」) */
export async function 이전빌드(pool: Pool, b: Pick<묶음, 'serviceId' | 'env' | 'buildNo'>, 첫시작: Date): Promise<첫장['previous']> {
  if (b.buildNo === null) return null;
  const r = await pool.query<{ build_no: string; report_id: string | null }>(
    `WITH 빌드 AS (
       SELECT build_no, min(s) AS s FROM (
         SELECT build_no, started_at AS s FROM test_run WHERE service_id = $1 AND env = $2 AND build_no IS NOT NULL AND origin <> 'SINGLE'
         UNION ALL
         SELECT build_no, COALESCE(started_at, created_at) FROM perf_run WHERE service_id = $1 AND env = $2 AND build_no IS NOT NULL) x
        WHERE build_no <> $3 GROUP BY build_no HAVING min(s) < $4 ORDER BY min(s) DESC LIMIT 1)
     SELECT b.build_no,
            (SELECT q.id FROM qa_report q WHERE q.service_id = $1 AND q.env = $2 AND q.build_no = b.build_no ORDER BY q.version DESC LIMIT 1) AS report_id
       FROM 빌드 b`,
    [b.serviceId, b.env, b.buildNo, 첫시작],
  );
  const 줄 = r.rows[0];
  return 줄 === undefined ? null : { buildNo: 줄.build_no, reportId: 줄.report_id === null ? null : Number(줄.report_id) };
}

async function 안정화(pool: Pool, b: 묶음): Promise<안정화줄 | null> {
  const r = await pool.query<{
    run_id: string;
    day: string;
    days: number;
    cases: number;
    pass_error_cases: number;
    residual: number;
    new_errors: number;
    confirmed: number;
    reopened: number;
  }>(
    `SELECT s.run_id, to_char(s.day, 'YYYY-MM-DD') AS day, (count(*) OVER ())::int AS days, s.cases, s.pass_error_cases, s.residual, s.new_errors, s.confirmed,
            (SELECT count(*) FROM stab_run_error e WHERE e.run_id = s.run_id AND e.state = 'REOPENED')::int AS reopened
       FROM stab_run s WHERE s.run_id = ANY($1::bigint[]) ORDER BY s.day DESC, s.run_id DESC LIMIT 1`,
    [b.runIds],
  );
  const 줄 = r.rows[0];
  if (줄 === undefined) return null;
  const 셈 = (
    await pool.query<Record<string, number>>(
      `SELECT ${(['WEB_PAGEERROR', 'WEB_CONSOLE', 'WEB_NETWORK', 'APP_CRASH', 'APP_ANR', 'GAME_EXCEPTION'] as const)
        .map((s) => `count(DISTINCT o.tc_id) FILTER (WHERE e.source = '${s}')::int AS "${s}"`)
        .join(', ')}, count(DISTINCT o.tc_id) FILTER (WHERE e.source IN ('APP_CRASH', 'APP_ANR'))::int AS "GAME_CRASH"
         FROM stab_occurrence o JOIN stab_error e ON e.id = o.error_id WHERE o.run_id = $1`,
      [줄.run_id],
    )
  ).rows[0]!;
  return {
    day: 줄.day,
    days: 줄.days,
    passErrorCases: 줄.pass_error_cases,
    cases: 줄.cases,
    sources: 출처차례[b.serviceKind].map((source) => ({ source, cases: 셈[source] ?? 0 })),
    residual: 줄.residual,
    newErrors: 줄.new_errors,
    reopened: 줄.reopened,
    confirmed: 줄.confirmed,
  };
}

export async function 첫장을센다(pool: Pool, b: 묶음): Promise<{ summary: 첫장; performers: string[] }> {
  const 실행 = (
    await pool.query<{ kind: string; service_name: string; base_url: string; tests_repo: string; started_at: Date; finished_at: Date | null; compat_set_id: string | null }>(
      'SELECT kind, service_name, base_url, tests_repo, started_at, finished_at, compat_set_id FROM test_run WHERE run_id = ANY($1::bigint[]) ORDER BY started_at, run_id',
      [b.runIds],
    )
  ).rows;
  const 성능 = (
    await pool.query<{ id: string; kind: string; scenario_id: string | null; service_name: string; base_url: string; s: Date; finished_at: Date | null; status: string; targets: { verdict?: string }[] | null }>(
      `SELECT r.id, r.kind, r.scenario_id, sv.name AS service_name, r.base_url, COALESCE(r.started_at, r.created_at) AS s, r.finished_at, r.status, r.targets
         FROM perf_run r JOIN service sv ON sv.id = r.service_id WHERE r.id = ANY($1::bigint[]) ORDER BY 6, r.id`,
      [b.perfRunIds],
    )
  ).rows;
  const 시작들 = [...실행.map((r) => r.started_at), ...성능.map((r) => r.s)].sort((x, y) => x.getTime() - y.getTime());
  const 끝들 = [...실행, ...성능].flatMap((r) => (r.finished_at === null ? [] : [r.finished_at])).sort((x, y) => x.getTime() - y.getTime());
  const 첫시작 = 시작들[0] ?? new Date();
  // 머리의 이름 · 주소는 케이스 실행의 마지막 박제가 먼저다 — 성능 실행에는 이름 박제가 없다
  const 마지막 = 실행.at(-1) ?? 성능.at(-1);

  // 사람 수행자 — 정기 · 빌드 실행은 그 사람이 누른 것이 아니다. 이 묶음에 센 한 건 실행의 실행자도 든다 (§3.17 「수행자」)
  const 수행자 = (
    await pool.query<{ username: string; name: string }>(
      `SELECT DISTINCT ON (username) username, name FROM (
         SELECT r.triggered_by AS username, COALESCE(NULLIF(r.triggered_by_name, ''), r.triggered_by) AS name FROM test_run r
          WHERE r.run_id = ANY($1::bigint[]) AND r.origin NOT IN ('SCHEDULED', 'BUILD')
         UNION ALL
         SELECT r.triggered_by, COALESCE(NULLIF(r.triggered_by_name, ''), r.triggered_by) FROM test_run r JOIN test_run a ON a.run_id = r.rerun_of
          WHERE r.origin = 'SINGLE' AND r.rerun_of = ANY($1::bigint[]) AND r.status <> 'RUNNING' AND r.build_no IS NOT DISTINCT FROM a.build_no
         UNION ALL
         SELECT triggered_by, COALESCE(NULLIF(triggered_by_name, ''), triggered_by) FROM perf_run
          WHERE id = ANY($2::bigint[]) AND origin = 'MANUAL' AND triggered_by IS NOT NULL) x
        WHERE username <> '' ORDER BY username, name`,
      [b.runIds, b.perfRunIds],
    )
  ).rows;

  const 기능 = await 기능재료읽기(pool, { serviceId: b.serviceId, prefix: b.prefix, env: b.env, runIds: b.runIds, firstStartedAt: 첫시작 });

  // 호환성 · 성능은 세트 · 시나리오마다 마지막 실행 하나로 센다 — 다시 돌린 실행까지 더하면 같은 화면 · 목표가 두 번 든다
  const 마지막만 = <T,>(줄들: T[], 열쇠: (r: T) => string): T[] => [...new Map(줄들.map((r) => [열쇠(r), r])).values()];
  const 호환성실행 = (
    await pool.query<{ run_id: string; compat_set_id: string }>(
      `SELECT DISTINCT ON (compat_set_id) run_id, compat_set_id FROM test_run
        WHERE run_id = ANY($1::bigint[]) AND kind = 'COMPAT' ORDER BY compat_set_id, started_at DESC, run_id DESC`,
      [b.runIds],
    )
  ).rows;
  let 호환성: { devices: number; screens: number; suspect: number } | null = null;
  if (호환성실행.length > 0) {
    // 호환성 결과 모듈은 엔진 · 팜까지 끌고 와 실행 끝 자리에서 고리가 생긴다 — 쓸 때만 부른다
    const { 호환성요약들 } = await import('../compat/runView.js');
    const 요약 = [...(await 호환성요약들(호환성실행.map((r) => Number(r.run_id)))).values()];
    호환성 = 요약.reduce((a, s) => ({ devices: a.devices + s.devices, screens: a.screens + s.screens, suspect: a.suspect + s.confirmed + s.pending }), { devices: 0, screens: 0, suspect: 0 });
  }
  const 성능마지막 = 마지막만(성능, (r) => `${r.kind}:${r.scenario_id ?? ''}`);
  const 목표 = 성능마지막.flatMap((r) => r.targets ?? []);
  const 성능셈 = 성능.length === 0 ? null : { runs: 성능마지막.length, pass: 목표.filter((t) => t.verdict === 'PASS').length, fail: 목표.filter((t) => t.verdict === 'FAIL').length };

  const 안 = async (sql: string, 뺄: number[]): Promise<string[]> => (await pool.query<{ name: string }>(sql, [b.serviceId, 뺄])).rows.map((r) => r.name);
  const plan = {
    cases: 기능.plan,
    e2e: await 안('SELECT name FROM scenario WHERE service_id = $1 AND is_active AND id <> ALL($2::bigint[]) ORDER BY id', 기능.scenarioIds),
    compat: await 안(
      'SELECT name FROM compat_set WHERE service_id = $1 AND is_active AND id <> ALL($2::bigint[]) ORDER BY id',
      실행.flatMap((r) => (r.compat_set_id === null ? [] : [Number(r.compat_set_id)])),
    ),
    perf: await 안(
      'SELECT name FROM perf_scenario WHERE service_id = $1 AND deleted_at IS NULL AND id <> ALL($2::bigint[]) ORDER BY id',
      성능.flatMap((r) => (r.scenario_id === null ? [] : [Number(r.scenario_id)])),
    ),
  };

  const 비기능: 첫장['results']['nonFunctional'] = [
    { kind: 'COMPAT', quality: 'COMPATIBILITY', result: 호환성 },
    { kind: 'PERF', quality: 'PERFORMANCE_EFFICIENCY', result: 성능셈 },
  ];
  // 안정화 지표가 없는 API 애플리케이션에는 줄이 없다
  if (b.serviceKind !== 'API') 비기능.push({ kind: 'STAB', quality: 'RELIABILITY', result: await 안정화(pool, b) });

  const counts: Record<실패갈래, number> = { PRODUCT: 0, TEST: 0, ENV: 0, UNCLASSIFIED: 0 };
  for (const f of 기능.failures) counts[f.class] += 1;

  const kinds: 리포트종류[] = [
    ...(['FN', 'UI', 'E2E'] as const).filter((k) => 기능.results[k] !== null),
    ...(호환성 === null ? [] : (['COMPAT'] as const)),
    ...(성능셈 === null ? [] : (['PERF'] as const)),
  ];
  const 저장소 = 실행.at(-1)?.tests_repo;
  const previous = await 이전빌드(pool, b, 첫시작);
  const changes =
    b.buildNo === null
      ? null
      : await 변경사항을센다(pool, { serviceId: b.serviceId, env: b.env, runIds: b.runIds, firstStartedAt: 첫시작, lastStartedAt: 시작들.at(-1) ?? 첫시작, previousBuildNo: previous?.buildNo ?? null });
  return {
    performers: 수행자.map((p) => p.username),
    summary: {
      kinds,
      overview: {
        serviceName: 마지막?.service_name ?? '',
        env: b.env,
        baseUrl: 마지막?.base_url ?? '',
        buildNo: b.buildNo,
        testsRepo: 저장소 === undefined || 저장소 === '' ? null : 저장소,
        startedAt: 첫시작.toISOString(),
        finishedAt: 끝들.at(-1)?.toISOString() ?? null,
        performers: 수행자,
        runs: 실행.length + 성능.length,
        running: b.running,
      },
      results: { functional: (['FN', 'UI', 'E2E'] as const).map((kind) => ({ kind, result: 기능.results[kind] })), nonFunctional: 비기능 },
      plan,
      failures: { counts, items: 기능.failures },
      previous,
      changes,
    },
  };
}
