// 이 실행 · 이 사람이 디바이스 팜에 누구 이름으로 붙나를 고른다 (도메인/러너 §5.2 「팜 토큰은 누른 사람 것이 먼저다」)
// 누른 사람 · 서버 몫(DEVICE_FARM_RUN_AS) 모두 Auth 대신 PAT 다. undefined 면 SSO 를 끈 설치 · 서버 몫을 못 받음 — farm.ts 팜머리가 DEVICE_FARM_TOKEN 으로 채운다

import type { Pool } from 'pg';

import { 대신PAT } from '../auth/delegatedPat.js';
import { SSO설정읽기 } from '../auth/oidc.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

const 왜 = (err: unknown): string => (err instanceof Error ? err.message : String(err));

/** 서버 몫 — 정기 · 빌드 실행 · 작성 AI · 기기 성능 · 기기 목록. RUN_AS 가 비었거나 못 받으면 undefined(DEVICE_FARM_TOKEN 으로 물러선다) */
export async function 서버팜토큰(env: NodeJS.ProcessEnv = process.env): Promise<string | undefined> {
  const 이름 = env.DEVICE_FARM_RUN_AS?.trim() ?? '';
  if (이름 === '' || SSO설정읽기(env) === null) return undefined;
  try {
    return await 대신PAT({ username: 이름 });
  } catch (err) {
    console.error(`[farm-token] 서버 몫(DEVICE_FARM_RUN_AS)의 대신 PAT 를 못 받아 DEVICE_FARM_TOKEN 으로 간다: ${왜(err)}`);
    return undefined;
  }
}

/**
 * 그 계정 auth_sub 의 대신 PAT. 계정이 없거나 꺼졌거나 Auth 에 안 묶였으면(비밀번호로 만든 계정) null. 못 받으면 던진다 —
 * BTS 자동 설정(bts/setup.ts)도 같이 쓴다
 */
export async function 계정대신PAT(username: string): Promise<string | null> {
  const { rows } = await (await db()).query<{ auth_sub: string | null }>('SELECT auth_sub FROM app_user WHERE username = $1 AND is_active', [username]);
  const authSub = rows[0]?.auth_sub;
  return authSub === null || authSub === undefined ? null : 대신PAT({ userId: authSub });
}

/**
 * 그 사람 이름의 팜 토큰. 꺼진 · Auth 에 안 묶인 계정은 서버 몫이다 — 앞 판의 「토큰을 안 넣은 사람」과 같다.
 * **그 사람 것을 못 받으면 던진다** — 서버 몫으로 물러서면 Auth 가 끈 사람이 서버 이름으로 폰을 잡는다. 부르는 쪽이 그 항목을 NA 로 닫는다
 */
export async function 사람팜토큰(username: string): Promise<string | undefined> {
  if (SSO설정읽기() === null) return undefined;
  return (await 계정대신PAT(username)) ?? 서버팜토큰();
}

/**
 * 사람이 누른 실행(실행 버튼 · 실패 다시 실행 · 한 건 실행)이면 누른 사람 이름. 정기 · 빌드 실행은 늘 서버 몫이다 —
 * 정기 실행의 triggered_by 는 '스케줄러' 라 계정이 아니고, 빌드 실행은 CI 가 눌렀다
 */
export async function 실행팜토큰(runId: number): Promise<string | undefined> {
  if (SSO설정읽기() === null) return undefined;
  // kind 로 거르지 않는다 — 케이스 실행과 E2E 실행이 같은 번호 줄을 쓴다
  const { rows } = await (await db()).query<{ username: string }>(
    `SELECT u.username FROM test_run r JOIN app_user u ON u.username = r.triggered_by
      WHERE r.run_id = $1 AND r.origin IN ('MANUAL', 'RERUN', 'SINGLE') AND u.is_active`,
    [runId],
  );
  const 누가 = rows[0]?.username;
  return 누가 === undefined ? 서버팜토큰() : 사람팜토큰(누가);
}
