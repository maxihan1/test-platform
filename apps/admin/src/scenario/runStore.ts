// 시나리오 실행을 만든다 — 최신 버전으로 test_run(SCENARIO) 한 행과 부품마다 NA 행을 세우고 러너 요청을 돌려준다 (SPEC 도메인/시나리오 §3.7 · §7)

import type { Platform, ScenarioExecuteRequest, ScenarioPart } from '@platform/kit';
import type { Pool, PoolClient } from 'pg';

import { 저장값을채운다 } from '../execution/savedInput.js';
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
  unconfirmed: string | null;
}

interface 판정 {
  version: number;
  거절: 시나리오실행오류 | null;
}

type 실행 = { runId: number; 요청: ScenarioExecuteRequest };

export async function 실행만들기(id: number, env: string, 사람: 저장하는사람): Promise<실행> {
  // 판정(케이스 파일 읽기 · pool 연결)은 트랜잭션 밖에서 먼저 한다. 연결 하나를 쥔 채 pool 에서 또 꺼내면
  // 동시 요청이 풀 크기만큼 올 때 교착한다. 그 사이 새 버전이 저장됐으면 새 버전으로 처음부터 다시 한다
  // 누가 쉬지 않고 저장하면 끝나지 않으므로 세 번에서 멈춘다 — 사람이 다시 누르면 된다
  for (let 번 = 0; 번 < 3; 번 += 1) {
    const 결과 = await 잠그고만들기(id, env, 사람, await 미리판정(id));
    if (결과 !== null) return 결과;
  }
  throw new 시나리오실행오류('NOT_RUNNABLE', '실행하는 사이 시나리오가 계속 새로 저장됐다. 다시 눌러 달라');
}

async function 미리판정(id: number): Promise<판정 | undefined> {
  const r = await (await db()).query<{ version: number; prefix: string; parts: ScenarioPart[] }>(
    `SELECT v.version, s.prefix, v.parts
       FROM scenario sc
       JOIN service s ON s.id = sc.service_id
       JOIN LATERAL (SELECT version, parts FROM scenario_version
                      WHERE scenario_id = sc.id ORDER BY version DESC LIMIT 1) v ON true
      WHERE sc.id = $1`,
    [id],
  );
  const 행 = r.rows[0];
  if (행 === undefined) return undefined;
  const 번호들 = 행.parts.flatMap((p) => (p.kind === 'case' ? [p.tcId] : []));
  return { version: 행.version, 거절: await 실행가능확인(행.parts, 번호들, 행.prefix) };
}

// 판정한 버전이 잠근 뒤의 최신과 다르면 null — 부른 쪽이 다시 판정한다
async function 잠그고만들기(id: number, env: string, 사람: 저장하는사람, 판정: 판정 | undefined): Promise<실행 | null> {
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

    if (판정 === undefined || 판정.version !== 행.version) {
      await c.query('ROLLBACK');
      return null;
    }
    if (판정.거절 !== null) throw 판정.거절;

    const parts = 행.parts;
    const 번호들 = parts.flatMap((p) => (p.kind === 'case' ? [p.tcId] : []));

    // 스냅샷은 카탈로그 캐시에서 SQL 로 읽는다 — createRun 과 같은 까닭. 재료는 판정에만 쓴다
    const 케이스 = await c.query<케이스행>(
      `SELECT tc_id, name, precondition, file_path, param_schema, expected_schema, unconfirmed
         FROM test_case WHERE tc_id = ANY($1::text[])`,
      [번호들],
    );
    const 케이스들 = new Map(케이스.rows.map((r) => [r.tc_id, r]));

    // 저장값을 채우면 커진다. 판정은 조립만 쟀으므로 채운 목록을 다시 잰다 (§7). 던지면 아래 catch 가 되돌린다
    const 채운부품 = await 부품채우기(c, parts, 케이스들);
    const 크기사유 = 제한시간크기사유(채운부품);
    if (크기사유.length > 0) {
      throw new 시나리오실행오류('NOT_RUNNABLE', `실행할 수 없는 시나리오다: 저장값을 채운 뒤 ${크기사유.join(' · ')}`);
    }

    const run = await c.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, service_id, service_name, tests_repo,
                             base_url, notify_slack, kind, scenario_id, scenario_version)
       VALUES ($1, $2, $3, 'RUNNING', $4, $5, $6, $7, $8, false, 'SCENARIO', $9, $10) RETURNING run_id`,
      [행.name, 사람.username, 사람.displayName, env, 행.service_id, 행.service_name, 행.tests_repo, baseUrl, id, 행.version],
    );
    const runId = Number(run.rows[0]!.run_id);

    const 요청부품: ScenarioExecuteRequest['parts'] = [];
    for (const [i, p] of 채운부품.entries()) {
      const 케 = p.kind === 'case' ? 케이스들.get(p.tcId) : undefined;
      if (p.kind === 'case' && 케 === undefined) {
        // 판정과 이 SELECT 사이에 카탈로그 행이 사라진 경우다. 스냅샷 없이 줄을 세우면 CHECK 가 막는다
        throw new 시나리오실행오류('NOT_RUNNABLE', `${i + 1}번 부품: ${p.tcId} 는 없거나 비활성인 케이스다`);
      }
      await c.query(
        `INSERT INTO scenario_run_part (run_id, seq, kind, tc_id, tc_name, part, file_path, param_schema, expected_schema,
                                        timeout_ms, precondition, unconfirmed, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'NA')`,
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
          // 케이스가 나중에 확정돼도 그날의 증적은 미확정 표시를 지녀야 한다 (run_item.unconfirmed 와 같다)
          케?.unconfirmed ?? null,
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

type 케이스부품 = Extract<ScenarioPart, { kind: 'case' }>;

/**
 * case 부품의 조립에 없는 칸을 저장값으로 채운다 — 단독 실행과 같은 규칙이다 (시나리오 §3.7 · 실행 §3.2).
 * 값 꽂기 칸은 「입력한 값」이라 저장값으로 안 채운다 — 실제 값은 러너가 꽂고 bound 에 남는다 (게이트 1 ①).
 * 시험 실행도 같은 것을 부른다. 연결은 트랜잭션 것을 받는다 — 쥔 채 pool 에서 또 꺼내면 교착한다
 */
export async function 부품채우기(
  c: Pick<PoolClient, 'query'>,
  parts: ScenarioPart[],
  케이스들: Map<string, { param_schema: unknown; expected_schema: unknown }>,
): Promise<ScenarioPart[]> {
  const 케이스부품들 = parts.filter((p): p is 케이스부품 => p.kind === 'case');
  const 채움 = await 저장값을채운다(c, 케이스부품들, 케이스들);
  return parts.map((p) => {
    if (p.kind !== 'case') return p;
    const 찬 = 채움[케이스부품들.indexOf(p)]!;
    const 꽂을칸 = new Set((p.links ?? []).flatMap((l) => (l.kind === 'bind' && !Object.hasOwn(p.params, l.param) ? [l.param] : [])));
    return { ...찬, params: Object.fromEntries(Object.entries(찬.params).filter(([k]) => !꽂을칸.has(k))) };
  });
}

// 목록·상세의 runnable 과 같은 판정을 본다 (게이트 1). 뿌리 밖 경로도 재료에서 빠져 CASE_INACTIVE 가 된다
async function 실행가능확인(parts: ScenarioPart[], 번호들: string[], prefix: string): Promise<시나리오실행오류 | null> {
  const 재료 = await 케이스재료(번호들, prefix);
  const 결과 = 점검(parts, 재료.카탈로그);
  if (결과.runnable) return null;
  const 사유 = [
    ...결과.checks
      .filter((ch) => ch.reason === 'CASE_INACTIVE')
      .map((ch) => {
        const p = parts[ch.seq - 1];
        return `${ch.seq}번 부품: ${p?.kind === 'case' ? p.tcId : ''} 는 없거나 비활성인 케이스다`;
      }),
    ...제한시간크기사유(parts),
  ];
  return new 시나리오실행오류('NOT_RUNNABLE', `실행할 수 없는 시나리오다: ${사유.join(' · ')}`);
}
