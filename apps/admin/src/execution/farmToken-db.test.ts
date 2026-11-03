// 어느 실행이 누구 이름(Auth 대신 PAT)으로 팜에 붙는가를 실제 DB 로 본다 — 사람이 누른 실행만 그 사람, 정기 · 빌드 · 비활성 · Auth 에 안 묶인 계정은 서버 몫. DATABASE_URL이 있을 때만 돈다

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 대신PAT } from '../auth/delegatedPat.js';

import { 사람팜토큰, 서버팜토큰, 실행팜토큰 } from './farmToken.js';

vi.mock('../auth/delegatedPat.js', () => ({
  대신PAT: vi.fn(async (누구: { userId: string } | { username: string }) => ('userId' in 누구 ? `pat_id_${누구.userId}` : `pat_name_${누구.username}`)),
}));

const 연결 = process.env.DATABASE_URL;
const 계정들 = ['xftr-on', 'xftr-off', 'xftr-local'];

describe.skipIf(연결 === undefined)('실행팜토큰 · 사람팜토큰 · 서버팜토큰', () => {
  const 실행: Record<'MANUAL' | 'RERUN' | 'SINGLE' | 'SCHEDULED' | 'BUILD' | '비활성' | '안묶임', number> = {
    MANUAL: 0, RERUN: 0, SINGLE: 0, SCHEDULED: 0, BUILD: 0, 비활성: 0, 안묶임: 0,
  };

  async function 치우기() {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM test_run WHERE run_id = ANY($1)', [Object.values(실행).filter((n) => n > 0)]);
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
  }

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM app_user WHERE username = ANY($1)', [계정들]);
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password, auth_sub, is_active)
            VALUES ('xftr-on', '켜진 사람', NULL, 'member', 'none', true, false, 'xftr-sub-on', true),
                   ('xftr-off', '꺼진 사람', NULL, 'member', 'none', true, false, 'xftr-sub-off', false),
                   ('xftr-local', '안 묶인 사람', NULL, 'member', 'none', true, false, NULL, true)`,
    );
    const 넣기 = async (누구: string, origin: string): Promise<number> =>
      Number(
        (
          await pool.query<{ run_id: string }>(
            `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url, kind, origin, finished_at)
                  VALUES ('XFTR 실행', $1, 'qa', 'FINISHED', NULL, '', '', '', 'FN', $2, now()) RETURNING run_id`,
            [누구, origin],
          )
        ).rows[0]!.run_id,
      );
    실행.MANUAL = await 넣기('xftr-on', 'MANUAL');
    실행.RERUN = await 넣기('xftr-on', 'RERUN');
    실행.SINGLE = await 넣기('xftr-on', 'SINGLE');
    // 정기 · 빌드 실행의 triggered_by 가 우연히 계정 이름과 같아도 서버 몫이어야 한다
    실행.SCHEDULED = await 넣기('xftr-on', 'SCHEDULED');
    실행.BUILD = await 넣기('xftr-on', 'BUILD');
    실행.비활성 = await 넣기('xftr-off', 'MANUAL');
    실행.안묶임 = await 넣기('xftr-local', 'MANUAL');
  });

  beforeEach(() => {
    vi.mocked(대신PAT).mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  afterAll(치우기);

  const SSO켠다 = (runAs = 'maxi') => {
    vi.stubEnv('AUTH_ISSUER', 'http://127.0.0.1:9');
    vi.stubEnv('AUTH_CLIENT_ID', 'test-platform');
    vi.stubEnv('AUTH_CLIENT_SECRET', 'xftr-secret');
    vi.stubEnv('PLATFORM_PUBLIC_URL', 'http://localhost:3000/');
    vi.stubEnv('DEVICE_FARM_RUN_AS', runAs);
  };

  it('사람이 누른 실행은 그 사람 auth_sub 의 대신 PAT, 정기 · 빌드 · 비활성 · 안 묶인 계정은 서버 몫(RUN_AS)이다', async () => {
    SSO켠다();
    expect(await 실행팜토큰(실행.MANUAL)).toBe('pat_id_xftr-sub-on');
    expect(await 실행팜토큰(실행.RERUN)).toBe('pat_id_xftr-sub-on');
    expect(await 실행팜토큰(실행.SINGLE)).toBe('pat_id_xftr-sub-on');
    expect(await 실행팜토큰(실행.SCHEDULED)).toBe('pat_name_maxi');
    expect(await 실행팜토큰(실행.BUILD)).toBe('pat_name_maxi');
    expect(await 실행팜토큰(실행.비활성)).toBe('pat_name_maxi');
    expect(await 실행팜토큰(실행.안묶임)).toBe('pat_name_maxi');
    expect(await 사람팜토큰('xftr-on')).toBe('pat_id_xftr-sub-on');
    expect(await 사람팜토큰('xftr-off')).toBe('pat_name_maxi');
    expect(await 사람팜토큰('xftr-local')).toBe('pat_name_maxi');
  });

  it('그 사람 것을 못 받으면 서버 몫, 그것도 못 받으면 undefined(DEVICE_FARM_TOKEN 으로 물러선다)', async () => {
    SSO켠다();
    vi.mocked(대신PAT).mockRejectedValueOnce(new Error('HTTP 404'));
    expect(await 실행팜토큰(실행.MANUAL)).toBe('pat_name_maxi');
    vi.mocked(대신PAT).mockRejectedValueOnce(new Error('HTTP 404')).mockRejectedValueOnce(new Error('HTTP 503'));
    expect(await 사람팜토큰('xftr-on')).toBeUndefined();
  });

  it('DEVICE_FARM_RUN_AS 가 비면 서버 몫은 undefined 다 — Auth 를 부르지 않는다', async () => {
    SSO켠다('');
    expect(await 서버팜토큰()).toBeUndefined();
    expect(await 실행팜토큰(실행.SCHEDULED)).toBeUndefined();
    expect(vi.mocked(대신PAT)).not.toHaveBeenCalled();
  });

  it('SSO 를 끈 설치는 아무도 Auth 에 묻지 않는다 — 팜머리가 DEVICE_FARM_TOKEN 을 싣는다', async () => {
    vi.stubEnv('AUTH_ISSUER', '');
    vi.stubEnv('AUTH_CLIENT_ID', '');
    vi.stubEnv('AUTH_CLIENT_SECRET', '');
    vi.stubEnv('DEVICE_FARM_RUN_AS', 'maxi');
    expect(await 실행팜토큰(실행.MANUAL)).toBeUndefined();
    expect(await 사람팜토큰('xftr-on')).toBeUndefined();
    expect(await 서버팜토큰()).toBeUndefined();
    expect(vi.mocked(대신PAT)).not.toHaveBeenCalled();
  });
});
