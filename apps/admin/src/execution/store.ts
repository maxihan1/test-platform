// 실행 묶음과 실행 항목을 만들고 결과를 되쓴다 (SPEC §3.2)
// params·expected·케이스명·사전조건은 전부 실행 시점의 스냅샷이다. param_set을 참조만 하면
// 나중에 값이 바뀌었을 때 과거 증적이 거짓이 된다

import type { ApiAuth, Platform } from '@platform/kit';

import type { Pool } from 'pg';

import { 미확정사유SQL } from '../prd/unconfirmed.js';
import { API인증읽기 } from '../settings/envs.js';

import { DEFAULT_TIMEOUT_MS, 선언밖디바이스 } from './location.js';
import { 대상서버계정, 저장값을채운다 } from './savedInput.js';
import { 실행종류 } from './runKind.js';
import { 다시실행사유, 제목을짓는다 } from './runOrigin.js';

// 사람이 읽을 자리에서는 PC·모바일로 쓴다. desktop·mobile은 코드와 러너 사이에서만 쓰는 이름이다
const PLATFORM_LABEL: Record<Platform, string> = { desktop: 'PC', mobile: '모바일', android: 'Android 앱' };

// 요청이 잘못된 것과 서버가 고장난 것을 라우트가 문자열로 가려내지 않게 한다
export class RunInputError extends Error {
  constructor(
    readonly code:
      | 'CASE_NOT_FOUND'
      | 'INVALID_REQUEST'
      | 'MIXED_SERVICE'
      | 'MIXED_KIND'
      | 'ENV_NOT_FOUND'
      | 'SERVICE_FORBIDDEN'
      | 'TOO_MANY_ITEMS'
      | 'BAD_RERUN',
    message: string,
    // TOO_MANY_ITEMS 는 응답에 상한과 요청 건수를 같이 싣는다 (SPEC §8.2)
    readonly detail: { limit: number; requested: number } | undefined = undefined,
  ) {
    super(message);
    this.name = 'RunInputError';
  }
}

// 한 번에 만들어질 실행 항목의 상한. 설정값으로 빼지 않는다 — 설정이 늘면 「어느 값이었더라」가 는다.
// 숫자를 바꾸려면 SPEC §8.2 를 먼저 고친다
export const MAX_ITEMS = 5000;

export interface RunItemInput {
  tcId: string;
  platforms: Platform[];
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  timeoutMs?: number;
}

export interface CreateRunInput {
  // 제목은 받지 않는다 — 시작 방식과 담긴 케이스로 서버가 짓는다 (SPEC 실행 §7 「자동 제목」)
  origin: 'MANUAL' | 'SCHEDULED';
  // 「실패 N건 다시 실행」이 싣는 원래 실행. 있으면 시작 방식이 RERUN 이다
  rerunOf?: number;
  // 로그인한 사람의 아이디. 요청 본문이 아니라 문(auth/gate.ts)이 실어 준 값에서 온다 (SPEC §3.5)
  triggeredBy: string;
  // 실행 당시의 사람 이름을 박제한다. 계정 이름이 바뀌거나 지워져도 과거 증적은 흔들리지 않는다.
  // 비어 있으면 인증 도입 이전 행이라는 표시다 (SPEC §3.5 · §6 · §8.6)
  triggeredByName?: string;
  // 대상 서버 키. 기본값을 두지 않는다 — 안 채우면 빈 칸이 아니라 틀린 값이 남는다 (SPEC §6)
  env: string;
  // 회차 수. 요청 최상위에 하나다 — 항목마다 다르면 「실행 항목이 N건 생깁니다」를 셀 수 없다 (SPEC §8.2)
  repeat?: number;
  // 끝났을 때 Slack 으로 알릴지. 기본은 꺼짐이고 정기 실행만 늘 켠다 (SPEC §8.9)
  notifySlack?: boolean;
  items: RunItemInput[];
}

// 디스패처가 러너를 부르는 데 필요한 것만 담는다 (SPEC §5.1 ExecuteRequest)
export interface PendingItem {
  historyId: number;
  tcId: string;
  platform: Platform;
  filePath: string;
  // 이번 실행이 두드릴 주소. 요청이 싣지 않고 서버가 service_env에서 찾는다 (SPEC §6 · §7)
  baseUrl: string;
  params: Record<string, unknown>;
  expected: Record<string, unknown>;
  timeoutMs: number;
  // android 항목만. 그 대상 서버 줄의 앱 파일 경로 — 없으면 러너가 자기 환경값을 쓴다 (러너 §5.2 · APP-F1-03)
  app?: string;
  // 그 대상 서버 줄의 API 인증. 설정이 API 애플리케이션에만 넣게 하므로 있으면 API 케이스다 (도메인/API §3.8)
  apiAuths?: ApiAuth[];
  // 게임 애플리케이션의 android 항목만 (도메인/게임 §3.10 결정 6)
  engine?: 'GAME';
}

// tcId 접두사가 곧 서비스다. 요청이 서비스를 따로 싣게 두면 번호와 서비스가 어긋날 수 있다 (SPEC §7)
export function prefixOf(tcId: string): string {
  return tcId.split('-')[0] ?? '';
}

interface ServiceRow {
  id: string;
  name: string;
  tests_repo: string;
  kind: string;
  base_url: string | null;
  app_path: string | null;
  api_auths: unknown;
}

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. 풀은 실제로 쓸 때 가져온다 (catalog/store.ts와 같은 방식)
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

interface CaseRow {
  tc_id: string;
  name: string;
  precondition: string[];
  file_path: string;
  param_schema: Record<string, unknown>;
  expected_schema: Record<string, unknown>;
  unconfirmed: string | null;
  platforms: string[];
}

// 라벨·제한 시간·파일 경로도 실행 시점 값으로 박제한다. 카탈로그는 스캔 때마다 덮어쓰는 캐시라
// 나중에 읽으면 그날 무엇으로 돌렸는지가 달라진다 (SPEC §3.3 · §6)
const INSERT_ITEM = `
  INSERT INTO run_item (run_id, tc_id, platform, tc_name, precondition, params, expected, status,
                        file_path, param_schema, expected_schema, timeout_ms, attempt, unconfirmed)
  VALUES ($1, $2, $3, $4, $5, $6, $7, 'NA', $8, $9, $10, $11, $12, $13)
  RETURNING history_id`;

export async function createRun(input: CreateRunInput): Promise<{ runId: number; items: PendingItem[] }> {
  if (input.items.length === 0) throw new RunInputError('INVALID_REQUEST', '실행할 케이스가 하나도 없다');

  // 같은 실행 안에서 케이스×환경은 한 행뿐이다(run_item의 UNIQUE). 조용히 버리면 뒤에 넣은 입력값이 사라진다
  const seen = new Set<string>();
  for (const item of input.items) {
    if (item.platforms.length === 0) throw new RunInputError('INVALID_REQUEST', `${item.tcId}에 실행할 환경이 없다`);
    for (const platform of item.platforms) {
      const key = `${item.tcId}/${platform}`;
      if (seen.has(key)) {
        throw new RunInputError('INVALID_REQUEST', `${item.tcId}의 ${PLATFORM_LABEL[platform]} 환경이 두 번 들어 있다`);
      }
      seen.add(key);
    }
  }

  // 한 실행은 한 서비스다. 그래야 증적 머리말의 서비스 이름이 실행 전체를 대표한다 (SPEC §7)
  const prefixes = [...new Set(input.items.map((i) => prefixOf(i.tcId)))];
  if (prefixes.length > 1) {
    throw new RunInputError('MIXED_SERVICE', `한 실행에 서비스가 섞여 있다: ${prefixes.join(', ')}`);
  }
  const prefix = prefixes[0] ?? '';
  // 한 실행은 한 종류다 — 실행 기록 · 증적 · 견주기가 종류별로 갈린다 (SPEC 공통/4-데이터모델 「실행 종류」)
  const kind = 실행종류(input.items.map((i) => i.tcId));
  if (kind === null) throw new RunInputError('MIXED_KIND', '한 실행에 UI 테스트와 기능 테스트가 섞여 있다');
  if (input.env.trim() === '') throw new RunInputError('INVALID_REQUEST', '대상 서버를 고르지 않았다');

  const repeat = input.repeat ?? 1;
  if (!Number.isInteger(repeat) || repeat < 1) {
    throw new RunInputError('INVALID_REQUEST', '반복 횟수는 1 이상의 정수여야 한다');
  }

  // 막는 것은 repeat 가 아니라 만들어질 건수다. 그래야 케이스 수가 늘어도 같이 보호된다 (SPEC §8.2).
  // 동시 실행 2 는 돌아가는 프로세스 수를 막지 INSERT 건수를 막지 않는다
  const requested = input.items.reduce((n, i) => n + i.platforms.length, 0) * repeat;
  if (requested > MAX_ITEMS) {
    throw new RunInputError(
      'TOO_MANY_ITEMS',
      `한 번에 ${MAX_ITEMS}건까지 만들 수 있는데 ${requested}건을 요청했다`,
      { limit: MAX_ITEMS, requested },
    );
  }

  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');

    // 서비스와 대상 주소는 표에서 찾는다. 요청이 주소를 싣게 두면 아무 데나 쏠 수 있다 (SPEC §6)
    const service = await client.query<ServiceRow>(
      `SELECT s.id, s.name, s.tests_repo, s.kind, e.base_url, NULLIF(e.app_path, '') AS app_path, e.api_auths
         FROM service s
         LEFT JOIN service_env e ON e.service_id = s.id AND e.env = $2
        WHERE s.prefix = $1 AND s.is_active`,
      [prefix, input.env],
    );
    const found서비스 = service.rows[0];
    if (found서비스 === undefined) {
      throw new RunInputError('SERVICE_FORBIDDEN', `${prefix} 서비스를 찾을 수 없다`);
    }
    if (found서비스.base_url === null) {
      throw new RunInputError('ENV_NOT_FOUND', `${prefix} 서비스에 ${input.env} 대상 서버가 없다`);
    }
    const 인증들 = API인증읽기(found서비스.api_auths);

    // 케이스명·사전조건·파일 경로는 카탈로그가 채운 캐시에서 SQL로 읽는다. 카탈로그 코드를 import 하지 않는다.
    // 미확정 사유도 여기서 박제한다 — 확인 필요 항목이 나중에 확정돼도 그날 확정이 아니었다는 사실은 남아야 한다 (SPEC 실행 §3.2)
    const found = await client.query<CaseRow>(
      `SELECT tc_id, name, precondition, file_path, param_schema, expected_schema, ${미확정사유SQL('c')} AS unconfirmed, platforms
         FROM test_case c WHERE tc_id = ANY($1::text[])`,
      [input.items.map((i) => i.tcId)],
    );
    const cases = new Map(found.rows.map((r) => [r.tc_id, r]));
    const missing = input.items.filter((i) => !cases.has(i.tcId)).map((i) => i.tcId);
    if (missing.length > 0) throw new RunInputError('CASE_NOT_FOUND', `카탈로그에 없는 케이스다: ${missing.join(', ')}`);
    const 밖 = 선언밖디바이스(input.items, cases);
    if (밖) throw new RunInputError('INVALID_REQUEST', `${밖.tcId} 는 ${PLATFORM_LABEL[밖.platform]} 환경을 선언하지 않았다`);

    const tcIds = [...cases.keys()].sort();
    const origin = input.rerunOf === undefined ? input.origin : 'RERUN';
    if (input.rerunOf !== undefined) {
      const 사유 = await 다시실행사유(client, input.rerunOf, { serviceId: found서비스.id, kind, tcIds });
      if (사유 !== null) throw new RunInputError('BAD_RERUN', 사유);
    }
    const title = await 제목을짓는다(client, {
      origin,
      ...(input.rerunOf === undefined ? {} : { rerunOf: input.rerunOf }),
      prefix,
      kind,
      케이스들: tcIds.map((tcId) => ({ tcId, name: cases.get(tcId)!.name })),
    });

    // 서비스 이름·저장소·대상 주소는 실행 하나에 하나뿐인 사실이라 test_run에 박제한다 (SPEC §6)
    const run = await client.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, service_id, service_name, tests_repo, base_url, notify_slack, kind, origin, rerun_of)
       VALUES ($1, $2, $3, 'RUNNING', $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING run_id`,
      [
        title,
        input.triggeredBy,
        // NULL 이면 「실행자 미상 (인증 도입 이전)」으로 읽힌다. 모르는 것은 모른다고 적는다 (SPEC §8.6)
        input.triggeredByName ?? null,
        input.env,
        found서비스.id,
        found서비스.name,
        found서비스.tests_repo,
        found서비스.base_url,
        input.notifySlack ?? false,
        kind,
        origin,
        input.rerunOf ?? null,
      ],
    );
    const runId = Number(run.rows[0]!.run_id);

    // 요청에 없는 칸은 케이스 저장값으로, 그래도 빈 계정 칸은 이 실행 대상 서버 줄의 계정으로 채운다.
    // 채운 값도 run_item 에 박제된다 — 계정이 나중에 바뀌어도 지난 실행은 그대로다 (도메인/실행 §3.2)
    const 계정들 = await 대상서버계정(client, Number(found서비스.id), input.env);
    const 채운항목 = await 저장값을채운다(client, input.items, cases, 계정들);

    const items: PendingItem[] = [];
    for (const item of 채운항목) {
      const spec = cases.get(item.tcId)!;
      const timeoutMs = item.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      for (const platform of item.platforms) {
        // 회차는 1부터다. 러너에는 보이지 않는다 — historyId 만 다른 같은 요청을 N번 보낼 뿐이다 (SPEC §5.2)
        for (let attempt = 1; attempt <= repeat; attempt += 1) {
          const row = await client.query<{ history_id: string }>(INSERT_ITEM, [
            runId,
            item.tcId,
            platform,
            spec.name,
            JSON.stringify(spec.precondition),
            JSON.stringify(item.params),
            JSON.stringify(item.expected),
            spec.file_path,
            JSON.stringify(spec.param_schema),
            JSON.stringify(spec.expected_schema),
            timeoutMs,
            attempt,
            spec.unconfirmed,
          ]);
          items.push({
            historyId: Number(row.rows[0]!.history_id),
            tcId: item.tcId,
            platform,
            filePath: spec.file_path,
            baseUrl: found서비스.base_url,
            params: item.params,
            expected: item.expected,
            timeoutMs,
            ...(platform === 'android' && found서비스.app_path !== null && { app: found서비스.app_path }),
            ...(인증들.length > 0 && { apiAuths: 인증들 }),
            ...(platform === 'android' && found서비스.kind === 'GAME' && { engine: 'GAME' as const }),
          });
        }
      }
    }

    await client.query('COMMIT');
    return { runId, items };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { abortRun, finishItem, finishRun, recoverRunning, unfinishedItems, type AbortResult } from './runLifecycle.js';
