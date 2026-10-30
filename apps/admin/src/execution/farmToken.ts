// 이 실행 · 이 사람이 디바이스 팜에 어느 토큰으로 붙나를 고른다 (도메인/러너 §5.2 「팜 토큰은 누른 사람 것이 먼저다」)
// undefined 면 서버 몫(DEVICE_FARM_TOKEN)이다 — farm.ts 팜머리가 그것으로 채운다

import type { Pool } from 'pg';

import { SSO설정읽기 } from '../auth/oidc.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

// 넣고 지우는 통로 · 메뉴가 SSO 설치에만 있다. 끈 뒤에 남은 토큰을 쓰면 기간이 끝나도 지울 길이 없다
const 사람토큰을쓰나 = (): boolean => SSO설정읽기() !== null;

/** 그 사람이 넣은 토큰. 비활성 계정은 없는 것으로 친다 */
export async function 사람팜토큰(username: string): Promise<string | undefined> {
  if (!사람토큰을쓰나()) return undefined;
  const { rows } = await (await db()).query<{ farm_token: string | null }>(
    'SELECT farm_token FROM app_user WHERE username = $1 AND is_active',
    [username],
  );
  return rows[0]?.farm_token ?? undefined;
}

/**
 * 사람이 누른 실행(실행 버튼 · 실패 다시 실행 · 한 건 실행)이면 누른 사람 토큰. 정기 · 빌드 실행은 늘 서버 몫이다 —
 * 정기 실행의 triggered_by 는 '스케줄러' 라 계정이 아니고, 빌드 실행은 CI 가 눌렀다
 */
export async function 실행팜토큰(runId: number): Promise<string | undefined> {
  if (!사람토큰을쓰나()) return undefined;
  // kind 로 거르지 않는다 — 케이스 실행과 E2E 실행이 같은 번호 줄을 쓰고, 꺼내는 것은 화면에 안 실리는 토큰뿐이다
  const { rows } = await (await db()).query<{ farm_token: string | null }>(
    `SELECT u.farm_token FROM test_run r JOIN app_user u ON u.username = r.triggered_by
      WHERE r.run_id = $1 AND r.origin IN ('MANUAL', 'RERUN', 'SINGLE') AND u.is_active`,
    [runId],
  );
  return rows[0]?.farm_token ?? undefined;
}
