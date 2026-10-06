// E2E 시나리오 시험 실행 — 저장 안 한 조립을 검사해 서버 러너에 보내고 결과를 메모리 보관소에 둔다 (SPEC 도메인/시나리오 §7)

import { lstat, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

import type { Platform, ScenarioExecuteRequest, ScenarioExecuteResponse, ScenarioPart } from '@platform/kit';
import type { Pool } from 'pg';

import { findService } from '../catalog/store.js';
import { enqueue } from '../execution/dispatcher.js';
import { callScenarioRunner } from '../execution/runner.js';
import { artifactsDir } from '../execution/routes.js';
import { 가린다, 긴것부터, 비밀글자들, 시나리오시험 } from '../execution/trial.js';
import { 가린값들 } from '../web/mask.js';

import { type 케이스부품재료, 케이스재료 } from './parts.js';
import { 부품채우기 } from './runStore.js';
import { 시나리오제한시간, 제한시간크기사유, 조립검사 } from './validate.js';

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. CI 는 DB 없이 돌아야 하므로 쓸 때 가져온다
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export class 시험시작오류 extends Error {
  constructor(
    readonly code: 'INVALID_REQUEST' | 'ENV_NOT_FOUND',
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

/** 조립을 검사하고 줄에 세운다. 기다리지 않고 trialId 를 돌려준다. 바쁘면 TrialBusyError 를 그대로 던진다 */
export async function 시험시작(사람: { username: string }, 본문: 시험본문): Promise<string> {
  const 서비스 = await findService(본문.service);
  if (서비스 === null) throw new 시험시작오류('INVALID_REQUEST', `모르는 서비스다: ${본문.service}`);

  const 번호들 = 본문.parts.flatMap((p) => (p.kind === 'case' ? [p.tcId] : []));
  // 만들기와 같은 검사다 — 저장하면 거절될 조립을 시험으로 돌리게 두지 않는다
  const { 카탈로그, 부품재료 } = await 케이스재료(번호들, 본문.service);
  const 오류 = 조립검사(본문.parts, 본문.platform, 본문.service, 카탈로그);
  if (오류.length > 0) throw new 시험시작오류('INVALID_REQUEST', 오류.join(' · '));

  // 대상 주소는 표에서 찾는다. 요청이 주소를 싣게 두면 아무 데나 쏠 수 있다 (runStore.ts 와 같다)
  const pool = await db();
  const 대상 = await pool.query<{ base_url: string }>(
    'SELECT base_url FROM service_env WHERE service_id = $1 AND env = $2',
    [서비스.id, 본문.env],
  );
  const baseUrl = 대상.rows[0]?.base_url;
  if (baseUrl === undefined) {
    throw new 시험시작오류('ENV_NOT_FOUND', `${본문.service} 서비스에 ${본문.env} 대상 서버가 없다`);
  }

  const 행 = await pool.query<{ tc_id: string; file_path: string; param_schema: unknown; expected_schema: unknown }>(
    'SELECT tc_id, file_path, param_schema, expected_schema FROM test_case WHERE tc_id = ANY($1::text[])',
    [번호들],
  );
  const 케이스들 = new Map(행.rows.map((r) => [r.tc_id, r]));
  // 진짜 실행과 같은 채우기다 — 조립에서 비운 비밀번호도 저장값으로 러너에 간다. 채우면 커지므로 다시 잰다 (§7)
  const 채운부품 = await 부품채우기(pool, 본문.parts, 케이스들);
  const 크기사유 = 제한시간크기사유(채운부품);
  if (크기사유.length > 0) throw new 시험시작오류('INVALID_REQUEST', `저장값을 채운 뒤 ${크기사유.join(' · ')}`);
  const parts: ScenarioExecuteRequest['parts'] = 채운부품.map((p) =>
    p.kind === 'case' ? { ...p, filePath: 케이스들.get(p.tcId)?.file_path } : p,
  );

  // 조립 본문이 아니라 채운 값으로 모은다 — 저장값에서 온 비밀번호는 본문에 없다
  const 비밀 = 채운부품.flatMap((p) => {
    if (p.kind !== 'case') return [];
    const 재료 = 부품재료.get(p.tcId);
    return 재료 === undefined
      ? []
      : 비밀글자들({ paramSchema: 재료.paramSchema, expectedSchema: 재료.expectedSchema, params: p.params, expected: p.expected });
  });

  const trialId = 시나리오시험.시작한다(
    사람.username,
    본문.service,
    // 케이스 실행 · 진짜 시나리오 실행과 같은 줄에 한 자리를 쓴다 (§3.7 「동시성 · 시간」)
    (id) =>
      enqueue(async () => {
        const 시작 = Date.now();
        // 줄 한 자리를 최대 60분 쥔다. 누가 쥐었는지 운영자가 로그로 알 수 있게 한다
        console.info(`[scenario-trial] 시작 ${id} · ${사람.username} · ${본문.service}`);
        const 응답 = await callScenarioRunner({
          runId: null,
          trialId: id,
          platform: 본문.platform,
          baseUrl,
          parts,
          timeoutMs: 시나리오제한시간(본문.parts),
        });
        console.info(`[scenario-trial] 끝 ${id} · ${사람.username} · ${본문.service} · ${응답.status} · ${Date.now() - 시작}ms`);
        return 꽂은값가리기(응답, 본문.parts, 부품재료, 비밀);
      }),
    비밀,
  );

  // 치우기가 깨져도 시험은 돈다. 응답도 기다리게 하지 않는다
  void 옛시험치우기(artifactsDir(), Date.now()).catch((err: unknown) => {
    console.error('[scenario-trial] 옛 시험 사진 폴더를 치우지 못했다', err);
  });
  return trialId;
}

/**
 * 값 꽂기로 넣은 값(bound)은 응답에서야 안다 — 보관소에 미리 줄 비밀 목록에 못 넣는다.
 * 키로 먼저 가린다. 글자 바꾸기만으로는 숫자 비밀(pin: 1234)이 bound 에 남는다
 */
function 꽂은값가리기(
  응답: ScenarioExecuteResponse,
  조립: ScenarioPart[],
  재료: Map<string, 케이스부품재료>,
  비밀: string[],
): ScenarioExecuteResponse {
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
  return 가린다({ ...응답, parts: 부품들 }, 긴것부터([...비밀, ...꽂은비밀])) as ScenarioExecuteResponse;
}
