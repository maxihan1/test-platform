// 시나리오 실행을 만든다 — 최신 버전으로 test_run(SCENARIO) 한 행과 부품마다 NA 행을 세우고 러너 요청을 돌려준다 (SPEC 도메인/시나리오 §3.7 · §7)

import type { Platform, ScenarioExecuteRequest, ScenarioPart } from '@platform/kit';
import type { Pool } from 'pg';

import { 점검 } from './checks.js';
import { 케이스재료 } from './parts.js';
import type { 저장하는사람 } from './store.js';
import { 시나리오제한시간, 제한시간크기사유 } from './validate.js';

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. CI 는 DB 없이 돌아야 하므로 쓸 때 가져온다
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

// 부품 제한 시간의 케이스 몫. 러너에 넘기는 합(시나리오제한시간)과 같은 값이다
const 케이스몫 = 300000;

export class 시나리오실행오류 extends Error {
  constructor(
    readonly code: 'NOT_FOUND' | 'ARCHIVED' | 'SERVICE_INACTIVE' | 'ENV_NOT_FOUND' | 'NOT_RUNNABLE',
    message: string,
  ) {
    super(message);
  }
}

interface 머리행 {
  name: string;
  is_active: boolean;
  service_id: string;
  prefix: string;
  service_name: string;
  tests_repo: string;
  service_active: boolean;
  version: number;
  platform: Platform;
  parts: ScenarioPart[];
}

interface 케이스행 {
  tc_id: string;
  name: string;
  precondition: string[];
  file_path: string;
  param_schema: unknown;
  expected_schema: unknown;
}

export async function 실행만들기(
  id: number,
  env: string,
  사람: 저장하는사람,
): Promise<{ runId: number; 요청: ScenarioExecuteRequest }> {
  const c = await (await db()).connect();
  try {
    await c.query('BEGIN');
    // 시나리오 행을 잠가 고치기·되돌리기와 줄을 세운다 — 읽은 최신 버전이 INSERT 전에 바뀌지 않게
    const 머리 = await c.query<머리행>(
      `SELECT sc.name, sc.is_active, s.id AS service_id, s.prefix, s.name AS service_name, s.tests_repo,
              s.is_active AS service_active, v.version, v.platform, v.parts
         FROM scenario sc
         JOIN service s ON s.id = sc.service_id
         JOIN LATERAL (SELECT version, platform, parts FROM scenario_version
                        WHERE scenario_id = sc.id ORDER BY version DESC LIMIT 1) v ON true
        WHERE sc.id = $1
          FOR UPDATE OF sc`,
      [id],
    );
    const 행 = 머리.rows[0];
    if (행 === undefined) throw new 시나리오실행오류('NOT_FOUND', `없는 시나리오다: ${id}`);
    if (!행.is_active) throw new 시나리오실행오류('ARCHIVED', '치운 시나리오는 실행할 수 없다');
    if (!행.service_active) throw new 시나리오실행오류('SERVICE_INACTIVE', `모르는 서비스다: ${행.prefix}`);

    // 대상 주소는 표에서 찾는다. 요청이 주소를 싣게 두면 아무 데나 쏠 수 있다 (execution/store.ts createRun 과 같다)
    const 대상 = await c.query<{ base_url: string }>(
      'SELECT base_url FROM service_env WHERE service_id = $1 AND env = $2',
      [행.service_id, env],
    );
    const baseUrl = 대상.rows[0]?.base_url;
    if (baseUrl === undefined) {
      throw new 시나리오실행오류('ENV_NOT_FOUND', `${행.prefix} 서비스에 ${env} 대상 서버가 없다`);
    }

    const parts = 행.parts;
    const 번호들 = parts.flatMap((p) => (p.kind === 'case' ? [p.tcId] : []));
    await 실행가능확인(parts, 번호들, 행.prefix);

    // 스냅샷은 카탈로그 캐시에서 SQL 로 읽는다 — createRun 과 같은 까닭. 재료는 판정에만 쓴다
    const 케이스 = await c.query<케이스행>(
      `SELECT tc_id, name, precondition, file_path, param_schema, expected_schema
         FROM test_case WHERE tc_id = ANY($1::text[])`,
      [번호들],
    );
    const 케이스들 = new Map(케이스.rows.map((r) => [r.tc_id, r]));

    const run = await c.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, service_id, service_name, tests_repo,
                             base_url, notify_slack, kind, scenario_id, scenario_version)
       VALUES ($1, $2, $3, 'RUNNING', $4, $5, $6, $7, $8, false, 'SCENARIO', $9, $10) RETURNING run_id`,
      [행.name, 사람.username, 사람.displayName, env, 행.service_id, 행.service_name, 행.tests_repo, baseUrl, id, 행.version],
    );
    const runId = Number(run.rows[0]!.run_id);

    const 요청부품: ScenarioExecuteRequest['parts'] = [];
    for (const [i, p] of parts.entries()) {
      const 케 = p.kind === 'case' ? 케이스들.get(p.tcId) : undefined;
      if (p.kind === 'case' && 케 === undefined) {
        // 판정과 이 SELECT 사이에 카탈로그 행이 사라진 경우다. 스냅샷 없이 줄을 세우면 CHECK 가 막는다
        throw new 시나리오실행오류('NOT_RUNNABLE', `${i + 1}번 부품: ${p.tcId} 는 없거나 비활성인 케이스다`);
      }
      await c.query(
        `INSERT INTO scenario_run_part (run_id, seq, kind, tc_id, tc_name, part, file_path, param_schema, expected_schema,
                                        timeout_ms, precondition, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'NA')`,
        [
          runId,
          i + 1,
          p.kind,
          케?.tc_id ?? null,
          케?.name ?? null,
          JSON.stringify(p),
          케?.file_path ?? null,
          케 === undefined ? null : JSON.stringify(케.param_schema),
          케 === undefined ? null : JSON.stringify(케.expected_schema),
          케 === undefined ? null : 케이스몫,
          JSON.stringify(케?.precondition ?? []),
        ],
      );
      요청부품.push(케 === undefined ? p : { ...p, filePath: 케.file_path });
    }

    await c.query('COMMIT');
    return {
      runId,
      요청: { runId, platform: 행.platform, baseUrl, parts: 요청부품, timeoutMs: 시나리오제한시간(parts) },
    };
  } catch (err) {
    await c.query('ROLLBACK');
    throw err;
  } finally {
    c.release();
  }
}

// 목록·상세의 runnable 과 같은 판정을 본다 (게이트 1). 뿌리 밖 경로는 목록에선 500 이지만 실행 요청에선 거절 사유다
async function 실행가능확인(parts: ScenarioPart[], 번호들: string[], prefix: string): Promise<void> {
  let 재료: Awaited<ReturnType<typeof 케이스재료>>;
  try {
    재료 = await 케이스재료(번호들, prefix);
  } catch (err) {
    throw new 시나리오실행오류('NOT_RUNNABLE', `실행할 수 없는 시나리오다: ${(err as Error).message}`);
  }
  const 결과 = 점검(parts, 재료.카탈로그);
  if (결과.runnable) return;
  const 사유 = [
    ...결과.checks
      .filter((ch) => ch.reason === 'CASE_INACTIVE')
      .map((ch) => {
        const p = parts[ch.seq - 1];
        return `${ch.seq}번 부품: ${p?.kind === 'case' ? p.tcId : ''} 는 없거나 비활성인 케이스다`;
      }),
    ...제한시간크기사유(parts),
  ];
  throw new 시나리오실행오류('NOT_RUNNABLE', `실행할 수 없는 시나리오다: ${사유.join(' · ')}`);
}
