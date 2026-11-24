// 실행 묶음과 실행 항목을 만들고 결과를 되쓴다 (SPEC §3.2)
// params·expected·케이스명·사전조건은 전부 실행 시점의 스냅샷이다. param_set을 참조만 하면
// 나중에 값이 바뀌었을 때 과거 증적이 거짓이 된다

import { PC항목인가, type ApiAuth, type GamePopup, type Platform } from '@platform/kit';

import type { Pool } from 'pg';

import { 돌발팝업칸 } from '../prd/gameRoute.js';
import { API인증읽기, type 어드민키, 어드민키읽기 } from '../settings/envs.js';

import { 실행빌드, 앞빌드, 앱칸 } from './buildFile.js';
import { 엔진칸 } from './engineField.js';
import { 선언밖디바이스, 윈도우를펼친다, 플랫폼밖인가 } from './location.js';
import { 대상서버계정, 저장값을채운다 } from './savedInput.js';
import { 케이스를읽는다, 프로시저로펼친다, 프로시저에서빠졌나, 실행단위를넣는다 } from './runExec.js';
import { 프로시저못도는러너인가 } from './runnerAddr.js';
import { 실행종류 } from './runKind.js';
import { 다시실행사유, 제목을짓는다 } from './runOrigin.js';
import { 시작방식정하기 } from './single.js';
import { 구간지문들짓기, 케이스지문, 테스트커밋 } from './testVersion.js';
import { PC디바이스글 } from './pcPlatform.js';

// 사람이 읽을 자리에서는 PC·모바일로 쓴다. desktop·mobile은 코드와 러너 사이에서만 쓰는 이름이다
const PLATFORM_LABEL: Record<Platform, string> = { desktop: 'PC', mobile: '모바일', android: 'Android 앱', ...PC디바이스글 };

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
      | 'BAD_RERUN'
      // 러너가 프로시저를 못 돈다 — 사람이 건 실행만 거절한다(자동 실행은 프로시저 안 케이스만 뺀다). 도메인/실행 §3.2 「러너 능력」
      | 'RUNNER_NO_PROCEDURE'
      // 정기 · 빌드 · 배포 신호 실행에서 플랫폼 밖 값 · 지원 패드 밖 패드 · 못 보내는 프로시저 케이스를 빼고 나니 돌 항목이 없다 — 실패가 아니다(그 종류 실행만 안 선다)
      | 'NO_ITEMS',
    message: string,
    // TOO_MANY_ITEMS 는 응답에 상한과 요청 건수를 같이 싣는다 (SPEC §8.2).
    // 러너가 프로시저를 못 돌아 비운 NO_ITEMS 는 뺀 수를 싣는다 — 정기 실행이 회차 기록에 까닭을 남긴다 (도메인/정기실행 §3.16 「테스트 프로시저」)
    readonly detail: { limit: number; requested: number } | { procSkipped: number } | undefined = undefined,
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
  origin: 'MANUAL' | 'SCHEDULED' | 'BUILD';
  // 빌드로 시작한 실행만. 없으면 그 줄의 최신 빌드를 고정한다 (도메인/실행 §3.11)
  build?: { id: number; no: string; stage: 'SMOKE' | 'FULL' };
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
  // 모바일 웹 실행 위치. 고르개가 없는 시작(정기 · 빌드)은 서버 흉내다 (도메인/실행 §3.2 「모바일 웹 실행 위치」)
  mobileOn?: 'server' | 'vision';
  // 정기 실행 세트의 회차가 만든 실행만. 제목에 세트 이름 · 실행에 회차 번호를 달고, 통과 항목 logcat 은 안정화 기준 세트만 받는다 (도메인/정기실행 §3.16 「실행 만들기」)
  sched?: { occurrenceId: number; setName: string; base: boolean };
  items: RunItemInput[];
}

// 디스패처가 러너를 부르는 데 필요한 것만 담는다 (SPEC §5.1 ExecuteRequest)
export interface PendingItem {
  historyId: number;
  // 그 케이스 줄이 든 실행 단위 — 러너에 가는 번호다. 옛 꼴 케이스는 historyId 와 같고 프로시저는 그 케이스들이 같은 번호를 든다 (공통/4 「테스트 프로시저 표」)
  execId: number;
  // 프로시저 안 케이스만. 디스패처가 같은 execId 줄을 요청 하나로 묶어 보낸다 (도메인/러너 §5.2 「프로시저 실행」)
  procId?: string;
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
  // 실행에 고정한 빌드가 올린 파일이면 app 대신 번호만 — APK 는 폰을 잡은 뒤 서명 주소를 만들고, 윈도우 zip 은 디스패처가 PC 를 잡은 뒤 VISION 에 깐다 (도메인/실행 §3.11 · 게임 §3.10 「실행 하나의 흐름」)
  buildId?: number;
  // 앞 빌드 — app · buildId 와 같은 꼴(회사 저장소 주소면 주소, 올린 APK 면 번호). 실행 앱이 빌드일 때만 (도메인/러너 §5.2 「범용 앱 부품」 APP-F3-08)
  previousApp?: string;
  previousBuildId?: number;
  // 그 대상 서버 줄의 API 인증. 설정이 API 애플리케이션에만 넣게 하므로 있으면 API 케이스다 (도메인/API §3.8)
  apiAuths?: ApiAuth[];
  // engine 은 게임 애플리케이션의 android 항목만 (도메인/게임 §3.10 결정 6). adminKey 는 게임 · API 항목에 그 대상 서버 줄의 어드민 키 원문
  engine?: 'GAME';
  adminKey?: 어드민키;
  // 게임 항목만 — 그 애플리케이션 조작 맵의 「확인」 돌발 팝업 행. 게임 드라이버가 막힌 동작에서 닫고 한 번 더 한다 (도메인/게임 §3.10 결정 31)
  gamePopups?: GamePopup[];
  // mobile 항목을 실행 창 「실행 위치」에서 고른 Device VISION 실제 폰 Chrome 에서 돌린다 (도메인/실행 §3.2 「모바일 웹 실행 위치」)
  실제폰?: true;
  // 정기 실행 android 항목 — 러너가 통과해도 logcat 을 받아 안정화 지표가 크래시 · ANR 을 센다 (도메인/안정화 §3.15 결정 3)
  stability?: true;
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
  admin_key: unknown;
  game_platform: 'android' | 'windows' | null;
  game_pads: string[];
  procedure_mode: boolean;
}

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. 풀은 실제로 쓸 때 가져온다 (catalog/store.ts와 같은 방식)
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** @param 못보내나 프로시저 안 케이스가 든 실행을 만들 때만 묻는다 — 러너가 프로시저를 못 도나 (도메인/실행 §3.2 「러너 능력」) */
export async function createRun(
  요청: CreateRunInput,
  못보내나: () => Promise<boolean> = 프로시저못도는러너인가,
): Promise<{ runId: number; attachedTo: number | null; items: PendingItem[]; procSkipped: number }> {
  let input = 요청;
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
  if (input.env.trim() === '') throw new RunInputError('INVALID_REQUEST', '대상 서버를 고르지 않았다');

  const repeat = input.repeat ?? 1;
  const 실제폰 = input.mobileOn === 'vision';
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
      `SELECT s.id, s.name, s.tests_repo, s.kind, s.game_platform, s.game_pads, s.procedure_mode, e.base_url, NULLIF(e.app_path, '') AS app_path, e.api_auths, e.admin_key
         FROM service s
         LEFT JOIN service_env e ON e.service_id = s.id AND e.env = $2
        WHERE s.prefix = $1 AND s.is_active`,
      [prefix, input.env],
    );
    const found서비스 = service.rows[0];
    if (found서비스 === undefined) {
      throw new RunInputError('SERVICE_FORBIDDEN', `${prefix} 서비스를 찾을 수 없다`);
    }
    // 한 실행은 한 종류다 — 실행 기록 · 증적 · 견주기가 종류별로 갈린다. 「프로시저 작성」을 켠 애플리케이션은 섞여도 기능 하나다 (SPEC 공통/4-데이터모델 「실행 종류」)
    const kind = 실행종류(input.items.map((i) => i.tcId), found서비스.procedure_mode);
    if (kind === null) throw new RunInputError('MIXED_KIND', '한 실행에 UI 테스트와 기능 테스트가 섞여 있다');
    if (found서비스.base_url === null) {
      throw new RunInputError('ENV_NOT_FOUND', `${prefix} 서비스에 ${input.env} 대상 서버가 없다`);
    }
    const 인증들 = API인증읽기(found서비스.api_auths);
    // 게임 하나에 플랫폼 하나 — 윈도우 PC 는 PC 게임만, android 는 PC 게임이 아닌 것만 돈다 (도메인/게임 §3.10 결정 27 · §7)
    const 밖인가 = (p: string): boolean => 플랫폼밖인가(found서비스.kind, found서비스.game_platform, p);
    const 밖값 = input.items.flatMap((i) => i.platforms.filter(밖인가).map((p) => ({ tcId: i.tcId, p })))[0];
    if (밖값 !== undefined) {
      // 사람이 고른 것만 거절한다 — 정기 · 빌드 · 배포 신호 실행은 그 항목만 빼고 나머지를 돌린다. 케이스 하나 때문에 밤 정기 실행 전체가 멈추지 않게(스캐너가 문제 줄로 알린다)
      if (input.origin === 'MANUAL') throw new RunInputError('INVALID_REQUEST', `${밖값.tcId} 의 ${PLATFORM_LABEL[밖값.p]} 디바이스는 이 애플리케이션에서 돌지 않는다 — 게임 하나에 플랫폼 하나다`);
      input = { ...input, items: input.items.map((i) => ({ ...i, platforms: i.platforms.filter((p) => !밖인가(p)) })).filter((i) => i.platforms.length > 0) };
      if (input.items.length === 0) throw new RunInputError('NO_ITEMS', '이 애플리케이션 플랫폼으로 돌 케이스가 없다');
    }
    // 정기 · 빌드 · 배포 신호 실행은 카탈로그 선언을 그대로 싣는다 — 윈도우 값을 windows 하나로 접어 아래에서 지원 패드로 다시 펼친다(지원 패드에서 뺀 패드는 안 돈다)
    if (input.origin !== 'MANUAL') {
      input = { ...input, items: input.items.map((i) => ({ ...i, platforms: [...new Set(i.platforms.map((p) => (PC항목인가(p) ? 'windows' : p)))] })) };
    }

    const cases = await 케이스를읽는다(client, input.items.map((i) => i.tcId));
    const missing = input.items.filter((i) => !cases.has(i.tcId)).map((i) => i.tcId);
    if (missing.length > 0) throw new RunInputError('CASE_NOT_FOUND', `카탈로그에 없는 케이스다: ${missing.join(', ')}`);
    const 밖 = 선언밖디바이스(input.items, cases);
    if (밖) throw new RunInputError('INVALID_REQUEST', `${밖.tcId} 는 ${PLATFORM_LABEL[밖.platform]} 환경을 선언하지 않았다`);
    // 프로시저에서 빠진 케이스는 그 프로시저와 같이 돌 수 없다 — 사람이 건 실행은 케이스 테스트 실행처럼 404 로 거절하고 자동 실행은 그 케이스만 뺀다
    const 빠진 = input.items.filter((i) => 프로시저에서빠졌나(cases.get(i.tcId))).map((i) => i.tcId);
    if (빠진.length > 0) {
      if (input.origin === 'MANUAL') throw new RunInputError('CASE_NOT_FOUND', `테스트 프로시저에서 빠진 케이스다: ${빠진.join(', ')}`);
      input = { ...input, items: input.items.filter((i) => !빠진.includes(i.tcId)) };
      if (input.items.length === 0) throw new RunInputError('NO_ITEMS', '테스트 프로시저에서 빠진 케이스뿐이라 돌 케이스가 없다');
    }
    // 못 도는 러너에는 프로시저 파일을 보내지 않는다 — 사람이 건 실행은 거절하고 자동 실행은 그 케이스만 뺀다(디바이스가 안 맞는 케이스를 다루는 방식과 같다)
    const 프로시저안 = (tcId: string): boolean => (cases.get(tcId)?.proc_id ?? null) !== null;
    let procSkipped = 0;
    if (input.items.some((i) => 프로시저안(i.tcId)) && (await 못보내나())) {
      if (input.origin === 'MANUAL') throw new RunInputError('RUNNER_NO_PROCEDURE', '러너가 테스트 프로시저를 돌리지 못한다');
      procSkipped = input.items.filter((i) => 프로시저안(i.tcId)).length;
      input = { ...input, items: input.items.filter((i) => !프로시저안(i.tcId)) };
      if (input.items.length === 0) throw new RunInputError('NO_ITEMS', '러너가 테스트 프로시저를 돌리지 못해 돌 케이스가 없다', { procSkipped });
    }
    // 제목 · 「실패 다시」 검사 · 한 건 판정은 펼치기 전에 고른 케이스로 한다 (도메인/실행 §3.2 「테스트 프로시저 실행」)
    const tcIds = [...new Set(input.items.map((i) => i.tcId))].sort();
    input = { ...input, items: 윈도우를펼친다(await 프로시저로펼친다(client, input.items, cases), cases, found서비스.game_pads, input.rerunOf !== undefined) };
    if (input.items.length === 0) {
      throw new RunInputError(input.origin === 'MANUAL' ? 'INVALID_REQUEST' : 'NO_ITEMS', '실행할 케이스가 하나도 없다 — 버튼 그림 케이스의 패드가 지원 패드에 없다');
    }
    const 펼친수 = input.items.reduce((n, i) => n + i.platforms.length, 0) * repeat;
    if (펼친수 > MAX_ITEMS) {
      throw new RunInputError('TOO_MANY_ITEMS', `한 번에 ${MAX_ITEMS}건까지 만들 수 있는데 ${펼친수}건을 요청했다`, { limit: MAX_ITEMS, requested: 펼친수 });
    }

    if (input.rerunOf !== undefined) {
      const 사유 = await 다시실행사유(client, input.rerunOf, { serviceId: found서비스.id, kind, tcIds, 한종류: found서비스.procedure_mode });
      if (사유 !== null) throw new RunInputError('BAD_RERUN', 사유);
    }
    // 한 건(케이스 하나나 프로시저 하나 · 반복 1)은 새 실행으로 서지 않고 가장 최근 묶음 실행에 붙는다 (도메인/실행 §3.2)
    const { origin, rerunOf, attachedTo } = await 시작방식정하기(client, {
      origin: input.origin,
      ...(input.rerunOf === undefined ? {} : { rerunOf: input.rerunOf }),
      케이스들: tcIds.map((tcId) => ({ tcId, procId: cases.get(tcId)!.proc_id })),
      repeat,
      serviceId: found서비스.id,
      env: input.env,
      // 같은 케이스가 디바이스마다 따로 와도 한 건이다 — 고른 디바이스를 모두 본다
      platforms: input.items.flatMap((i) => i.platforms),
      실제폰,
    });
    // 실행은 끝까지 만들 때의 빌드를 깐다 — 뒤에 새 빌드가 와도 바뀌지 않는다 (도메인/실행 §3.11)
    const 빌드 = await 실행빌드(client, Number(found서비스.id), input.env, input.build?.id);
    // 옛판에서올리기 가 깔 앞 빌드 — 실행 빌드 바로 앞에 그 줄에 올린 빌드다 (도메인/러너 §5.2 「범용 앱 부품」 APP-F3-08)
    const 앞 = 빌드 === null ? null : await 앞빌드(client, Number(found서비스.id), input.env, 빌드.id);
    // 한 건이 프로시저 하나면 tcIds 는 모두 그 프로시저의 케이스다(한건인가) — 첫 케이스에서 번호 · 이름을 읽는다
    const 한프로시저 = cases.get(tcIds[0]!)!;
    const title = await 제목을짓는다(client, {
      origin,
      ...(origin === 'SINGLE' && 한프로시저.proc_id !== null && { 프로시저: { id: 한프로시저.proc_id, name: 한프로시저.proc_name } }),
      ...(rerunOf === null ? {} : { rerunOf }),
      ...(input.build === undefined ? {} : { build: { no: input.build.no, stage: input.build.stage } }),
      ...(input.sched === undefined ? {} : { setName: input.sched.setName }),
      prefix,
      kind,
      한종류: found서비스.procedure_mode,
      케이스들: tcIds.map((tcId) => ({ tcId, name: cases.get(tcId)!.name })),
    });

    // 서비스 이름·저장소·대상 주소는 실행 하나에 하나뿐인 사실이라 test_run에 박제한다 (SPEC §6)
    const run = await client.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, service_id, service_name, tests_repo, base_url, notify_slack, kind, origin, rerun_of,
                             build_id, build_no, build_stage, sched_occurrence_id)
       VALUES ($1, $2, $3, 'RUNNING', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING run_id`,
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
        // 한 건은 실행으로 서지 않아 알림에 걸 실행 화면이 없다 — 끝은 건 사람의 진행 창이 알린다 (도메인/실행 §8.9 Slack 표)
        origin !== 'SINGLE' && (input.notifySlack ?? false),
        kind,
        origin,
        rerunOf,
        빌드?.id ?? null,
        빌드?.buildNo ?? null,
        input.build?.stage ?? null,
        input.sched?.occurrenceId ?? null,
      ],
    );
    const runId = Number(run.rows[0]!.run_id);

    // 요청에 없는 칸은 케이스 저장값으로, 그래도 빈 계정 칸은 이 실행 대상 서버 줄의 계정으로 채운다.
    // 채운 값도 run_item 에 박제된다 — 계정이 나중에 바뀌어도 지난 실행은 그대로다 (도메인/실행 §3.2)
    const 계정들 = await 대상서버계정(client, Number(found서비스.id), input.env);
    const 채운항목 = await 저장값을채운다(client, input.items, cases, 계정들);
    // 테스트 버전도 박제한다 — QA 리포트가 앞 빌드와 케이스 신규 · 수정 · 삭제를 견준다 (도메인/리포팅 §3.17 「변경 사항」)
    const 커밋 = await 테스트커밋();
    const 지문들 = new Map(await Promise.all([...cases.values()].map(async (c) => [c.tc_id, await 케이스지문(c.file_path)] as const)));
    const 구간지문들 = await 구간지문들짓기([...cases.values()]);

    // 게임 애플리케이션만 읽는다 — 항목마다 같은 목록이라 한 번
    const 팝업칸 = found서비스.kind === 'GAME' ? await 돌발팝업칸(Number(found서비스.id), client) : {};
    const items = await 실행단위를넣는다(client, {
      runId,
      repeat,
      items: 채운항목,
      cases,
      커밋,
      지문들,
      구간지문들,
      줄칸: (platform) => ({
        baseUrl: found서비스.base_url!,
        ...(platform === 'android' && 앱칸(빌드, found서비스.app_path, 앞)),
        ...(인증들.length > 0 && { apiAuths: 인증들 }),
        ...엔진칸(found서비스.kind, platform, 어드민키읽기(found서비스.admin_key)),
        ...(엔진칸(found서비스.kind, platform).engine === 'GAME' && 팝업칸),
        ...(platform === 'mobile' && 실제폰 && { 실제폰: true as const }),
        ...(platform === 'android' && input.sched?.base === true && { stability: true as const }),
        // PC 게임의 빌드는 늘 올린 zip 이다 — 없으면 디스패처가 「Windows 빌드가 없습니다」로 닫는다
        ...(PC항목인가(platform) && 빌드?.hasFile === true && { buildId: 빌드.id }),
      }),
    });

    await client.query('COMMIT');
    return { runId, attachedTo, items, procSkipped };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { abortRun, finishItem, finishRun, recoverRunning, unfinishedItems, type AbortResult } from './runLifecycle.js';
