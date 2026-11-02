// E2E 시나리오 시험 실행 — 저장 안 한 조립을 검사해 서버 러너에 보내고 결과를 메모리 보관소에 둔다 (SPEC 도메인/시나리오 §7)

import { lstat, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import type { Platform, ScenarioExecuteRequest, ScenarioPart } from '@platform/kit';
import type { Pool } from 'pg';

import { 부품판 } from '../apidoc/caseDoc.js';
import { findService } from '../catalog/store.js';
import { enqueue } from '../execution/dispatcher.js';
import { 팜주소 } from '../execution/farm.js';
import { 사람팜토큰 } from '../execution/farmToken.js';
import { 폰을바로잡는다, 폰을놓는다 } from '../execution/phone.js';
import { callScenarioRunner, 켜진내컴퓨터러너 } from '../execution/runner.js';
import { artifactsDir } from '../execution/routes.js';
import { 가린다, 긴것부터, 비밀글자들, 시나리오시험, type 시나리오시험결과 } from '../execution/trial.js';
import { 가린값들 } from '../web/mask.js';

import { 같은프로젝트접두사, 계정없음, 단계인증, 단계주소, 삭제코드합치기, 쓰는앱읽기, 앱종류들, 앱종류읽기 } from './apps.js';
import { 앱단계인가, 케이스접두사, 쓰는접두사 } from './mixed.js';
import { type 케이스부품재료, 케이스재료 } from './parts.js';
import { 꽂은폰으로, 팜폰으로돌린다, 폰값 } from './phone.js';
import { 부품채우기 } from './runStore.js';
import { 꽂은값비밀, 실패부품trace, 시나리오trace경로, trace를지운다 } from './runTrace.js';
import { 시나리오제한시간, 제한시간크기사유, 조립검사 } from './validate.js';

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. CI 는 DB 없이 돌아야 하므로 쓸 때 가져온다
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export class 시험시작오류 extends Error {
  constructor(
    readonly code: 'INVALID_REQUEST' | 'ENV_NOT_FOUND' | 'FARM_OFF' | 'DEVICE_BUSY',
    message: string,
  ) {
    super(message);
  }
}

export interface 시험본문 {
  service: string;
  env: string;
  platform: Platform;
  parts: ScenarioPart[];
}

const 하루 = 24 * 60 * 60 * 1000;
// randomUUID 가 만드는 모양만 지운다. trial/ 안에 다른 것이 생겨도 건드리지 않는다
export const uuid모양 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** 24시간 지난 `runs/trial/<uuid>` 를 지운다 (§7). 링크는 따라가지 않고 링크만 지운다 */
export async function 옛시험치우기(뿌리: string, 지금: number): Promise<void> {
  const 폴더 = join(뿌리, 'runs', 'trial');
  let 이름들: string[];
  try {
    이름들 = await readdir(폴더);
  } catch {
    return;
  }
  for (const 이름 of 이름들) {
    if (!uuid모양.test(이름)) continue;
    const 자리 = join(폴더, 이름);
    let 정보;
    try {
      정보 = await lstat(자리);
    } catch {
      // 동시에 시작한 다른 시험이 먼저 지웠다. 이 하나만 넘기고 나머지는 계속 치운다
      continue;
    }
    if (지금 - 정보.mtimeMs <= 하루) continue;
    // rm 은 링크 자체를 지우고 가리키던 곳으로 내려가지 않는다
    await rm(자리, { recursive: !정보.isSymbolicLink(), force: true });
  }
}

/** 조립을 검사하고 러너에 보낼 부품을 채운다. 성능 시나리오 녹화(perf/record.ts)도 같은 채우기를 쓴다 */
export async function 시험재료(본문: 시험본문) {
  const 서비스 = await findService(본문.service);
  if (서비스 === null) throw new 시험시작오류('INVALID_REQUEST', `모르는 서비스다: ${본문.service}`);

  const 번호들 = 본문.parts.flatMap((p) => (p.kind === 'case' ? [p.tcId] : []));
  // 만들기와 같은 검사다 — 저장하면 거절될 조립을 시험으로 돌리게 두지 않는다
  // 시작 애플리케이션과 같은 프로젝트의 케이스까지 읽는다 (§3.7 결정 13)
  const 허용 = await 같은프로젝트접두사(본문.service);
  const { 카탈로그, 부품재료 } = await 케이스재료(번호들, 허용);
  const 오류 = 조립검사(본문.parts, 본문.platform, 본문.service, 카탈로그, 허용, await 앱종류읽기(허용));
  if (오류.length > 0) throw new 시험시작오류('INVALID_REQUEST', 오류.join(' · '));

  // 대상 주소는 표에서 찾는다. 요청이 주소를 싣게 두면 아무 데나 쏠 수 있다 (runStore.ts 와 같다)
  const pool = await db();
  // 섞인 애플리케이션마다 같은 이름의 줄을 찾는다. 하나라도 없으면 거절한다 (§3.7 결정 13)
  const { 앱들, 없음 } = await 쓰는앱읽기(쓰는접두사(본문.parts, 본문.service), 본문.env, pool);
  if (없음 !== null) throw new 시험시작오류('ENV_NOT_FOUND', `${없음} 서비스에 ${본문.env} 대상 서버가 없다`);
  const baseUrl = 앱들.get(본문.service)!.baseUrl;
  const 종류 = 앱종류들(앱들);

  const 행 = await pool.query<{ tc_id: string; file_path: string; param_schema: unknown; expected_schema: unknown }>(
    'SELECT tc_id, file_path, param_schema, expected_schema FROM test_case WHERE tc_id = ANY($1::text[])',
    [번호들],
  );
  const 케이스들 = new Map(행.rows.map((r) => [r.tc_id, r]));
  // 진짜 실행과 같은 채우기다 — 조립에서 비운 비밀번호도 저장값 · 그 대상 서버 계정으로 러너에 간다. 채우면 커지므로 다시 잰다 (§7)
  const 채운부품 = await 부품채우기(pool, 본문.parts, 케이스들, (tcId) => 앱들.get(케이스접두사(tcId))?.계정들 ?? 계정없음);
  const 크기사유 = 제한시간크기사유(채운부품);
  if (크기사유.length > 0) throw new 시험시작오류('INVALID_REQUEST', `저장값을 채운 뒤 ${크기사유.join(' · ')}`);
  const parts: ScenarioExecuteRequest['parts'] = await Promise.all(
    채운부품.map(async (p) =>
      p.kind === 'case'
        ? {
            ...p,
            ...단계주소(p, 본문.service, 앱들),
            ...단계인증(p, 본문.service, 앱들),
            ...(await 부품판(p)),
            filePath: 케이스들.get(p.tcId)?.file_path,
            // 진짜 실행과 같다 — 앱 · 게임 단계 표시는 admin 이 애플리케이션 종류로 정한다 (결정 16)
            ...(앱단계인가(p, 종류) && { appStep: true }),
          }
        : { ...p, ...단계주소(p, 본문.service, 앱들), ...단계인증(p, 본문.service, 앱들) },
    ),
  );

  // 조립 본문이 아니라 채운 값으로 모은다 — 저장값에서 온 비밀번호는 본문에 없다
  const 비밀 = 채운부품.flatMap((p) => {
    if (p.kind !== 'case') return [];
    const 재료 = 부품재료.get(p.tcId);
    return 재료 === undefined
      ? []
      : 비밀글자들({ paramSchema: 재료.paramSchema, expectedSchema: 재료.expectedSchema, params: p.params, expected: p.expected });
  });
  return { 앱들, baseUrl, parts, 부품재료, 비밀, 폰: 폰값(본문.parts, 앱들, 본문.env) };
}

/** 조립을 검사하고 줄에 세운다. 기다리지 않고 trialId 를 돌려준다. 바쁘면 TrialBusyError 를 그대로 던진다 */
export async function 시험시작(사람: { username: string }, 본문: 시험본문): Promise<string> {
  const { 앱들, baseUrl, parts, 부품재료, 비밀, 폰 } = await 시험재료(본문);
  // 앱 · 게임 단계가 있으면 내 컴퓨터 러너에 꽂은 폰, 꺼져 있으면 서버 러너 + 팜이다 (결정 16 「시험 실행은 지금 규칙 그대로다」)
  if (폰 !== null && 팜주소() === undefined && (await 켜진내컴퓨터러너()) === undefined) {
    throw new 시험시작오류('FARM_OFF', '내 컴퓨터 러너가 꺼져 있고 이 서버에는 Device VISION(DEVICE_FARM_URL)도 없다');
  }
  // 다른 검사를 다 지난 뒤, 동시성 자리보다 먼저 디바이스 줄을 본다 — 케이스 테스트 실행처럼 기다리지 않는다
  if (폰 !== null && !폰을바로잡는다()) throw new 시험시작오류('DEVICE_BUSY', '디바이스가 다른 실행에 쓰이는 중이다');
  const 놓기 = () => {
    if (폰 !== null) 폰을놓는다();
  };
  let trialId: string;
  try {
    trialId = 시나리오시험.시작한다(
      사람.username,
      본문.service,
      // 케이스 실행 · 진짜 시나리오 실행과 같은 줄에 한 자리를 쓴다 (§3.7 「동시성 · 시간」). 폰 잠금은 일이 어떻게 끝나든 놓는다
      (id) => enqueue(() => 시험돌기(id, 사람.username, 본문, { 앱들, baseUrl, parts, 부품재료, 비밀, 폰 })).finally(놓기),
      비밀,
    );
  } catch (err) {
    // 시작한다 는 일을 부르기 전에만 던진다 — 위 finally 가 안 도니 여기서 놓는다
    놓기();
    throw err;
  }

  // 치우기가 깨져도 시험은 돈다. 응답도 기다리게 하지 않는다
  void 옛시험치우기(artifactsDir(), Date.now()).catch((err: unknown) => {
    console.error('[scenario-trial] 옛 시험 사진 폴더를 치우지 못했다', err);
  });
  return trialId;
}

type 시험재료결과 = Awaited<ReturnType<typeof 시험재료>>;

async function 시험돌기(id: string, 누구: string, 본문: 시험본문, 재료: 시험재료결과): Promise<시나리오시험결과> {
  const { 앱들, baseUrl, parts, 부품재료, 비밀, 폰 } = 재료;
  const 시작 = Date.now();
  // 줄 한 자리를 최대 60분 쥔다. 누가 쥐었는지 운영자가 로그로 알 수 있게 한다
  console.info(`[scenario-trial] 시작 ${id} · ${누구} · ${본문.service}`);
  const 내러너 = await 켜진내컴퓨터러너();
  const 요청: ScenarioExecuteRequest = {
    runId: null,
    trialId: id,
    platform: 본문.platform,
    ...폰?.칸,
    baseUrl,
    parts,
    timeoutMs: 시나리오제한시간(본문.parts),
    // 줄에서 기다리는 사이 trace 적재가 코드를 바꿀 수 있어 돌기 직전에 읽는다
    deleteStatuses: await 삭제코드합치기(앱들),
  };
  // 앱 · 게임 단계는 내 컴퓨터 러너에 꽂은 폰, 꺼졌으면 서버 러너 + 팜에서 잡은 폰이다 (결정 16)
  const 응답 =
    폰 === null
      ? await callScenarioRunner(요청, 내러너)
      : 내러너 === undefined
        ? await 팜폰으로돌린다(요청, 폰.폰, () => 사람팜토큰(누구))
        : await 꽂은폰으로(요청, 폰.폰, 내러너);
  console.info(`[scenario-trial] 끝 ${id} · ${내러너 === undefined ? '서버 러너' : '내 컴퓨터 러너'} · ${누구} · ${본문.service} · ${응답.status} · ${Date.now() - 시작}ms`);
  // 기록은 DB 없이 결과에 싣는다. 꽂은 값의 비밀도 자르기 전에 넣는다 — 본문을 2000자로 자른 뒤에 가리면 경계에 걸친 조각이 남는다 (§7 「실패 기록」)
  const 꽂은 = 응답.parts.flatMap((r) => {
    const p = 본문.parts[r.seq - 1];
    return 꽂은값비밀(r.bound ?? {}, p?.kind === 'case' ? 부품재료.get(p.tcId)?.paramSchema : undefined);
  });
  const 경로 = 시나리오trace경로({ trialId: id });
  const 기록들 = await 실패부품trace(경로, 응답, [...비밀, ...꽂은]);
  await trace를지운다(경로, 기록들);
  const 실은 = { ...응답, parts: 응답.parts.map((p) => { const 기록 = 기록들.get(p.seq); return 기록 === undefined ? p : { ...p, trace: 기록 }; }) };
  return 꽂은값가리기(실은, 본문.parts, 부품재료, 비밀);
}

/**
 * 값 꽂기로 넣은 값(bound)은 응답에서야 안다 — 보관소에 미리 줄 비밀 목록에 못 넣는다.
 * 키로 먼저 가린다. 글자 바꾸기만으로는 숫자 비밀(pin: 1234)이 bound 에 남는다
 */
function 꽂은값가리기(
  응답: 시나리오시험결과,
  조립: ScenarioPart[],
  재료: Map<string, 케이스부품재료>,
  비밀: string[],
): 시나리오시험결과 {
  const 꽂은비밀: string[] = [];
  const 부품들 = 응답.parts.map((r) => {
    if (r.bound === undefined) return r;
    const p = 조립[r.seq - 1];
    // 명세를 못 찾으면 가린값들이 이름으로 가린다 — 모를 때는 가리는 쪽으로 실패한다
    const bound = 가린값들(r.bound, p?.kind === 'case' ? 재료.get(p.tcId)?.paramSchema : undefined);
    for (const [k, v] of Object.entries(r.bound)) {
      if (bound[k] !== v && (typeof v === 'string' || typeof v === 'number') && v !== '') 꽂은비밀.push(String(v));
    }
    return { ...r, bound };
  });
  // 채운 비밀과 한 줄로 세워야 짧은 비밀이 긴 비밀을 먼저 쪼개지 않는다
  return 가린다({ ...응답, parts: 부품들 }, 긴것부터([...비밀, ...꽂은비밀])) as 시나리오시험결과;
}
