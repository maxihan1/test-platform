// 시나리오 실행을 만든다 — 최신 버전으로 test_run(SCENARIO) 한 행과 부품마다 NA 행을 세우고 러너 요청을 돌려준다 (SPEC 도메인/시나리오 §3.7 · §7)

import type { BrowserPlatform, ScenarioDeleteStatus, ScenarioExecuteRequest, ScenarioPart } from '@platform/kit';
import type { 역할계정 } from '@platform/kit/accounts';
import type { Pool, PoolClient } from 'pg';

import { 저장값을채운다 } from '../execution/savedInput.js';
import { 삭제코드를읽는다 } from '../prd/apiMap.js';
import { 미확정사유SQL } from '../prd/unconfirmed.js';
import { 같은프로젝트접두사, 단계주소, 쓰는앱읽기 } from './apps.js';
import { 점검 } from './checks.js';
import { 케이스접두사, 쓰는접두사 } from './mixed.js';
import { 케이스재료 } from './parts.js';
import type { 저장하는사람 } from './store.js';
import { 시나리오제한시간, 제한시간크기사유, type 카탈로그 } from './validate.js';

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
  platform: BrowserPlatform;
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
  허용: string[];
  거절: 시나리오실행오류 | null;
  카탈로그: 카탈로그;
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
  // 시작 애플리케이션과 같은 프로젝트의 케이스까지 읽는다 (§3.7 결정 13)
  const 허용 = await 같은프로젝트접두사(행.prefix);
  const { 카탈로그 } = await 케이스재료(번호들, 허용);
  return { version: 행.version, 허용, 거절: 실행가능확인(행.parts, 카탈로그), 카탈로그 };
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

    // 대상 주소는 표에서 찾는다. 요청이 주소를 싣게 두면 아무 데나 쏠 수 있다 (execution/store.ts createRun 과 같다).
    // 섞인 애플리케이션마다 같은 이름의 줄을 찾고 하나라도 없으면 거절한다 (§3.7 결정 13)
    const 쓰는 = 쓰는접두사(행.parts, 행.prefix);
    const { 앱들, 없음 } = await 쓰는앱읽기(쓰는, env, c);
    if (없음 !== null) throw new 시나리오실행오류('ENV_NOT_FOUND', `${없음} 서비스에 ${env} 대상 서버가 없다`);
    const baseUrl = 앱들.get(행.prefix)!.baseUrl;

    if (판정 === undefined || 판정.version !== 행.version) {
      await c.query('ROLLBACK');
      return null;
    }
    if (판정.거절 !== null) throw 판정.거절;
    // 저장 뒤 애플리케이션을 다른 프로젝트로 옮겼으면 API 단계는 케이스처럼 비활성으로 드러나지 않는다 — 여기서 막는다
    const 밖 = 쓰는.filter((a) => !판정.허용.includes(a));
    if (밖.length > 0) {
      throw new 시나리오실행오류('NOT_RUNNABLE', `실행할 수 없는 시나리오다: ${밖.join(' · ')} 는 ${행.prefix} 서비스와 같은 프로젝트가 아니다`);
    }

    // 저장 뒤 케이스가 바뀌어 건너뛸 수 없게 된 제목은 뺀다. 러너는 받은 제목이면 확인 절차도 건너뛴다 (결정 8)
    const parts = 행.parts.map((p) =>
      p.kind === 'case'
        ? { ...p, skipSteps: p.skipSteps.filter((t) => 판정.카탈로그.get(p.tcId)?.skippable.includes(t) === true) }
        : p,
    );
    const 번호들 = parts.flatMap((p) => (p.kind === 'case' ? [p.tcId] : []));

    // 스냅샷은 카탈로그 캐시에서 SQL 로 읽는다 — createRun 과 같은 까닭. 재료는 판정에만 쓴다
    const 케이스 = await c.query<케이스행>(
      `SELECT tc_id, name, precondition, file_path, param_schema, expected_schema, ${미확정사유SQL('c')} AS unconfirmed
         FROM test_case c WHERE tc_id = ANY($1::text[])`,
      [번호들],
    );
    const 케이스들 = new Map(케이스.rows.map((r) => [r.tc_id, r]));

    // 저장값을 채우면 커진다. 판정은 조립만 쟀으므로 채운 목록을 다시 잰다 (§7). 던지면 아래 catch 가 되돌린다
    const 채운부품 = await 부품채우기(c, parts, 케이스들, (tcId) => 앱들.get(케이스접두사(tcId))?.계정들 ?? []);
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
        throw new 시나리오실행오류('NOT_RUNNABLE', `${i + 1}번 단계: ${p.tcId} 는 없거나 비활성인 케이스다`);
      }
      const 주소 = 단계주소(p, 행.prefix, 앱들);
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
          JSON.stringify({ ...p, ...주소 }),
          케?.file_path ?? null,
          케 === undefined ? null : JSON.stringify(케.param_schema),
          케 === undefined ? null : JSON.stringify(케.expected_schema),
          케 === undefined ? null : 케이스몫,
          JSON.stringify(케?.precondition ?? []),
          // 케이스가 나중에 확정돼도 그날의 증적은 미확정 표시를 지녀야 한다 (run_item.unconfirmed 와 같다)
          케?.unconfirmed ?? null,
        ],
      );
      요청부품.push(케 === undefined ? { ...p, ...주소 } : { ...p, ...주소, filePath: 케.file_path });
    }

    // 확정 전에 쥔 손으로 읽는다 — 확정 뒤에 던지면 RUNNING 실행이 러너 없이 남는다
    // 섞인 애플리케이션 모두의 지도에서 읽는다. 호스트로 맞추므로 합쳐도 겹치지 않고, 러너 입구 상한(1000줄)까지만 싣는다
    const deleteStatuses: ScenarioDeleteStatus[] = [];
    for (const 앱 of 앱들.values()) deleteStatuses.push(...(await 삭제코드를읽는다(앱.serviceId, c)));
    deleteStatuses.length = Math.min(deleteStatuses.length, 1000);
    await c.query('COMMIT');
    return {
      runId,
      요청: { runId, platform: 행.platform, baseUrl, parts: 요청부품, timeoutMs: 시나리오제한시간(parts), deleteStatuses },
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
 * case 부품의 조립에 없는 칸을 저장값으로, 그래도 빈 계정 칸은 그 실행 대상 서버 줄의 계정(`계정들`)으로 채운다 —
 * 단독 실행과 같은 규칙이다 (시나리오 §3.7 · 실행 §3.2).
 * 값 꽂기 칸은 「입력한 값」이라 저장값 · 계정으로 안 채운다 — 실제 값은 러너가 꽂고 bound 에 남는다 (게이트 1 ①).
 * 시험 실행도 같은 것을 부른다. 연결은 트랜잭션 것을 받는다 — 쥔 채 pool 에서 또 꺼내면 교착한다
 */
export async function 부품채우기(
  c: Pick<PoolClient, 'query'>,
  parts: ScenarioPart[],
  케이스들: Map<string, { param_schema: unknown; expected_schema: unknown }>,
  계정들: readonly 역할계정[] | ((tcId: string) => readonly 역할계정[]) = [],
): Promise<ScenarioPart[]> {
  const 케이스부품들 = parts.filter((p): p is 케이스부품 => p.kind === 'case');
  const 채움 = await 계정별로채운다(c, 케이스부품들, 케이스들, 계정들);
  return parts.map((p) => {
    if (p.kind !== 'case') return p;
    const 찬 = 채움[케이스부품들.indexOf(p)]!;
    const 꽂을칸 = new Set((p.links ?? []).flatMap((l) => (l.kind === 'bind' && !Object.hasOwn(p.params, l.param) ? [l.param] : [])));
    return { ...찬, params: Object.fromEntries(Object.entries(찬.params).filter(([k]) => !꽂을칸.has(k))) };
  });
}

// 애플리케이션마다 그 대상 서버 줄의 계정이 다르다 (결정 13). 같은 계정 목록을 쓰는 부품끼리 묶어 채우고 원래 차례로 돌려놓는다
async function 계정별로채운다(
  c: Pick<PoolClient, 'query'>,
  부품들: 케이스부품[],
  케이스들: Map<string, { param_schema: unknown; expected_schema: unknown }>,
  계정들: readonly 역할계정[] | ((tcId: string) => readonly 역할계정[]),
): Promise<케이스부품[]> {
  if (typeof 계정들 !== 'function') return 저장값을채운다(c, 부품들, 케이스들, 계정들);
  const 묶음 = new Map<readonly 역할계정[], number[]>();
  부품들.forEach((p, i) => {
    const 계정 = 계정들(p.tcId);
    묶음.set(계정, [...(묶음.get(계정) ?? []), i]);
  });
  const 결과 = [...부품들];
  for (const [계정, 자리들] of 묶음) {
    const 채운 = await 저장값을채운다(c, 자리들.map((i) => 부품들[i]!), 케이스들, 계정);
    자리들.forEach((자리, k) => { 결과[자리] = 채운[k]!; });
  }
  return 결과;
}

// 목록·상세의 runnable 과 같은 판정을 본다 (게이트 1). 뿌리 밖 경로도 재료에서 빠져 CASE_INACTIVE 가 된다
function 실행가능확인(parts: ScenarioPart[], 재료: 카탈로그): 시나리오실행오류 | null {
  const 결과 = 점검(parts, 재료);
  if (결과.runnable) return null;
  const 사유 = [
    ...결과.checks
      .filter((ch) => ch.reason === 'CASE_INACTIVE')
      .map((ch) => {
        const p = parts[ch.seq - 1];
        return `${ch.seq}번 단계: ${p?.kind === 'case' ? p.tcId : ''} 는 없거나 비활성인 케이스다`;
      }),
    ...제한시간크기사유(parts),
  ];
  return new 시나리오실행오류('NOT_RUNNABLE', `실행할 수 없는 시나리오다: ${사유.join(' · ')}`);
}
