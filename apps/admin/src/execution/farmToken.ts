// 이 실행 · 이 사람이 디바이스 팜에 누구 이름으로 붙나를 고른다 (도메인/러너 §5.2 「팜 토큰은 누른 사람 것이 먼저다」)
// 누른 사람 · 서버 몫(DEVICE_FARM_RUN_AS) 모두 Auth 대신 PAT 다. undefined 면 SSO 를 끈 설치 · 못 받음 — farm.ts 팜머리가 DEVICE_FARM_TOKEN 으로 채운다

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

// Auth 에 안 묶인 계정(비밀번호로 만든 계정)이거나 그 사람 것을 못 받으면 서버 몫으로 돈다 — 앞 판의 「토큰을 안 넣은 사람」과 같다
async function 사람이름으로(authSub: string | null | undefined): Promise<string | undefined> {
  if (authSub === null || authSub === undefined) return 서버팜토큰();
  try {
    return await 대신PAT({ userId: authSub });
  } catch (err) {
    console.error(`[farm-token] 누른 사람의 대신 PAT 를 못 받아 서버 몫으로 간다: ${왜(err)}`);
    return 서버팜토큰();
  }
}

/** 그 사람 이름의 팜 토큰. 비활성 계정은 없는 것으로 친다 — 서버 몫이다 */
export async function 사람팜토큰(username: string): Promise<string | undefined> {
  if (SSO설정읽기() === null) return undefined;
  const { rows } = await (await db()).query<{ auth_sub: string | null }>('SELECT auth_sub FROM app_user WHERE username = $1 AND is_active', [username]);
  return 사람이름으로(rows[0]?.auth_sub);
}

/**
 * 사람이 누른 실행(실행 버튼 · 실패 다시 실행 · 한 건 실행)이면 누른 사람 이름. 정기 · 빌드 실행은 늘 서버 몫이다 —
 * 정기 실행의 triggered_by 는 '스케줄러' 라 계정이 아니고, 빌드 실행은 CI 가 눌렀다
 */
export async function 실행팜토큰(runId: number): Promise<string | undefined> {
  if (SSO설정읽기() === null) return undefined;
  // kind 로 거르지 않는다 — 케이스 실행과 E2E 실행이 같은 번호 줄을 쓴다
  const { rows } = await (await db()).query<{ auth_sub: string | null }>(
    `SELECT u.auth_sub FROM test_run r JOIN app_user u ON u.username = r.triggered_by
      WHERE r.run_id = $1 AND r.origin IN ('MANUAL', 'RERUN', 'SINGLE') AND u.is_active`,
    [runId],
  );
  return 사람이름으로(rows[0]?.auth_sub);
}
