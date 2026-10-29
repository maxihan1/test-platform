// 어느 실행이 누구 팜 토큰으로 도는가를 실제 DB 로 본다 — 사람이 누른 실행만 그 사람 것, 정기 · 빌드 · 비활성 · SSO 끔은 서버 몫. DATABASE_URL이 있을 때만 돈다

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { 사람팜토큰, 실행팜토큰 } from './farmToken.js';

const 연결 = process.env.DATABASE_URL;
const 계정들 = ['xftr-on', 'xftr-off'];

describe.skipIf(연결 === undefined)('실행팜토큰 · 사람팜토큰', () => {
  const 실행: Record<'MANUAL' | 'RERUN' | 'SCHEDULED' | 'BUILD' | '비활성', number> = { MANUAL: 0, RERUN: 0, SCHEDULED: 0, BUILD: 0, 비활성: 0 };

  async function 치우기() {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM test_run WHERE run_id = ANY($1)', [Object.values(실행).filter((n) => n > 0)]);
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
  }

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password, auth_sub, is_active, farm_token)
            VALUES ('xftr-on', '켜진 사람', NULL, 'member', 'none', true, false, 'xftr-sub-on', true, 'pat_on'),
                   ('xftr-off', '꺼진 사람', NULL, 'member', 'none', true, false, 'xftr-sub-off', false, 'pat_off')`,
    );
    const 넣기 = async (누구: string, origin: string): Promise<number> =>
      Number(
        (await pool.query<{ run_id: string }>(`INSERT INTO test_run (title, triggered_by, status, origin) VALUES ('XFTR 실행', $1, 'FINISHED', $2) RETURNING run_id`, [누구, origin]))
          .rows[0]!.run_id,
      );
    실행.MANUAL = await 넣기('xftr-on', 'MANUAL');
    실행.RERUN = await 넣기('xftr-on', 'RERUN');
    // 정기 · 빌드 실행의 triggered_by 가 우연히 계정 이름과 같아도 서버 몫이어야 한다
    실행.SCHEDULED = await 넣기('xftr-on', 'SCHEDULED');
    실행.BUILD = await 넣기('xftr-on', 'BUILD');
    실행.비활성 = await 넣기('xftr-off', 'MANUAL');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(치우기);

  const SSO켠다 = () => {
    vi.stubEnv('AUTH_ISSUER', 'http://127.0.0.1:9');
    vi.stubEnv('AUTH_CLIENT_ID', 'test-platform');
    vi.stubEnv('AUTH_CLIENT_SECRET', 'xftr-secret');
    vi.stubEnv('PLATFORM_PUBLIC_URL', 'http://localhost:3000/');
  };

  it('실행 버튼 · 실패 다시 실행은 누른 사람 토큰이고, 정기 · 빌드 실행과 비활성 계정은 서버 몫이다', async () => {
    SSO켠다();
    expect(await 실행팜토큰(실행.MANUAL)).toBe('pat_on');
    expect(await 실행팜토큰(실행.RERUN)).toBe('pat_on');
    expect(await 실행팜토큰(실행.SCHEDULED)).toBeUndefined();
    expect(await 실행팜토큰(실행.BUILD)).toBeUndefined();
    expect(await 실행팜토큰(실행.비활성)).toBeUndefined();
    expect(await 사람팜토큰('xftr-on')).toBe('pat_on');
    expect(await 사람팜토큰('xftr-off')).toBeUndefined();
  });

  it('SSO 를 끈 설치에서는 남은 토큰을 쓰지 않는다 — 지울 메뉴가 없다', async () => {
    vi.stubEnv('AUTH_ISSUER', '');
    vi.stubEnv('AUTH_CLIENT_ID', '');
    vi.stubEnv('AUTH_CLIENT_SECRET', '');
    expect(await 실행팜토큰(실행.MANUAL)).toBeUndefined();
    expect(await 사람팜토큰('xftr-on')).toBeUndefined();
  });
});
