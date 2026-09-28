// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 에이전트토큰만들기 } from './agentToken.js';
import { 확인 } from './identify.js';
import { 해시 } from './password.js';
import { 비밀번호도장, 사용자와해시 } from './store.js';

const 연결 = process.env.DATABASE_URL;

// 도장을 안 주면 지금 저장된 해시로 찍는다 — 로그인 직후의 출입증과 같다. null 이면 도장 없는 옛 출입증이다
async function 가짜요청(username: string | undefined, 도장?: string | null) {
  let 찍을것 = 도장 ?? undefined;
  if (도장 === undefined && username !== undefined && username !== '') {
    const { pool } = await import('../db/index.js');
    const rows = await pool.query<{ password_hash: string }>('SELECT password_hash FROM app_user WHERE username = $1', [username]);
    찍을것 = rows.rows[0] === undefined ? undefined : 비밀번호도장(rows.rows[0].password_hash);
  }
  const 칸 = { username, stamp: 찍을것 };
  return { session: { get: (key: 'username' | 'stamp') => 칸[key] } };
}

describe.skipIf(연결 === undefined)('확인 함수', () => {
  let 서비스id = 0;
  let 웹훅없는서비스id = 0;

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const 서비스 = await pool.query<{ id: number }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ('XFS1', '인증 검사용', '#445566', 'https://example.com/xfs', 'xfs')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
    );
    서비스id = 서비스.rows[0]!.id;

    // 실행 설정의 대상 서버 드롭다운이 읽을 값 (SPEC §8.2 → §7)
    await pool.query(
      `INSERT INTO service_env (service_id, env, base_url)
            VALUES ($1, 'qa', 'https://qa.xfs.test'), ($1, 'dev', 'https://dev.xfs.test')
       ON CONFLICT DO NOTHING`,
      [서비스id],
    );

    // 웹훅이 없는 서비스도 하나 둔다 — Slack 칸을 그릴지 말지가 이 값으로 갈린다
    const 웹훅없음 = await pool.query<{ id: number }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ('XFS1B', '웹훅 없는 서비스', '#556677', '', 'xfs1b')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
    );
    웹훅없는서비스id = 웹훅없음.rows[0]!.id;
    await pool.query('UPDATE service SET slack_webhook = $2 WHERE id = $1', [
      서비스id,
      'https://hooks.slack.test/xfs1',
    ]);

    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, must_change_password, is_approved)
            VALUES ($1, '김확인', $2, 'member', 'read', false, true)
       ON CONFLICT (username) DO UPDATE SET is_active = true, password_hash = EXCLUDED.password_hash,
         role = 'member', perm_dashboard = 'read', must_change_password = false, is_approved = true`,
      ['xfu1-live', await 해시('열려라참깨')],
    );
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, must_change_password, is_approved)
            VALUES ($1, '이관리', $2, 'admin', 'none', true, true)
       ON CONFLICT (username) DO UPDATE SET is_active = true,
         role = 'admin', perm_dashboard = 'none', must_change_password = true, is_approved = true`,
      ['xfu1-admin', await 해시('관리자')],
    );
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, is_active, is_approved, must_change_password)
            VALUES ($1, '박비활성', $2, 'admin', false, true, false)
       ON CONFLICT (username) DO UPDATE SET is_active = false, is_approved = true, must_change_password = false`,
      ['xfu1-dead', await 해시('아무거나')],
    );
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password)
            VALUES ($1, '정대기', $2, 'member', false, false)
       ON CONFLICT (username) DO UPDATE SET is_active = true, is_approved = false, must_change_password = false`,
      ['xfu1-pending', await 해시('기다려요')],
    );
    await pool.query(
      `INSERT INTO user_service (username, service_id, perm_cases, perm_runs, perm_authoring)
            VALUES ($1, $2, 'write', 'read', 'none'), ($1, $3, 'read', 'none', 'none')
       ON CONFLICT (username, service_id) DO UPDATE
         SET perm_cases = EXCLUDED.perm_cases, perm_runs = EXCLUDED.perm_runs, perm_authoring = EXCLUDED.perm_authoring`,
      ['xfu1-live', 서비스id, 웹훅없는서비스id],
    );
    // 관리자는 저장된 칸이 낮아도 전부 쓰기로 받아야 한다 — 일부러 읽기만 저장해 둔다
    await pool.query(
      `INSERT INTO user_service (username, service_id, perm_cases, perm_runs, perm_authoring)
            VALUES ($1, $2, 'read', 'none', 'none')
       ON CONFLICT (username, service_id) DO UPDATE
         SET perm_cases = 'read', perm_runs = 'none', perm_authoring = 'none'`,
      ['xfu1-admin', 서비스id],
    );
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(`DELETE FROM user_service WHERE username LIKE 'xfu1%'`);
    await pool.query(`DELETE FROM app_user WHERE username LIKE 'xfu1%'`);
    await pool.query(`DELETE FROM service_env WHERE service_id IN ($1, $2)`, [서비스id, 웹훅없는서비스id]);
    await pool.query(`DELETE FROM service WHERE prefix LIKE 'XFS1%'`);
  });

  it('세션에 담긴 아이디로 등급과 배정 서비스를 돌려준다', async () => {
    const user = await 확인(await 가짜요청('xfu1-live'));
    expect(user?.username).toBe('xfu1-live');
    expect(user?.displayName).toBe('김확인');
    expect(user?.role).toBe('member');
    expect(user?.services.map((s) => s.prefix)).toEqual(['XFS1', 'XFS1B']);
  });

  it('배정받은 서비스마다 대상 서버 목록이 온다. 실행 설정이 읽을 통로가 여기뿐이다 (SPEC §8.2 · §7)', async () => {
    const user = await 확인(await 가짜요청('xfu1-live'));
    const 하나 = user?.services.find((s) => s.prefix === 'XFS1');
    expect(하나?.envs).toEqual([
      { env: 'dev', baseUrl: 'https://dev.xfs.test' },
      { env: 'qa', baseUrl: 'https://qa.xfs.test' },
    ]);
  });

  it('대상 서버가 없는 서비스는 빈 목록이다. 없는 것을 지어내지 않는다', async () => {
    const user = await 확인(await 가짜요청('xfu1-live'));
    expect(user?.services.find((s) => s.prefix === 'XFS1B')?.envs).toEqual([]);
  });

  it('Slack 웹훅이 설정됐는지만 알려준다', async () => {
    const user = await 확인(await 가짜요청('xfu1-live'));
    expect(user?.services.find((s) => s.prefix === 'XFS1')?.hasSlackWebhook).toBe(true);
    expect(user?.services.find((s) => s.prefix === 'XFS1B')?.hasSlackWebhook).toBe(false);
  });

  it('웹훅 주소 자체는 응답 어디에도 없다 (SPEC §7)', async () => {
    const user = await 확인(await 가짜요청('xfu1-live'));
    expect(JSON.stringify(user)).not.toContain('hooks.slack.test');
  });

  it('세션이 비어 있으면 아무도 아니다', async () => {
    expect(await 확인(await 가짜요청(undefined))).toBeNull();
    expect(await 확인(await 가짜요청(''))).toBeNull();
  });

  it('세션이 살아 있어도 계정이 비활성이면 끊긴다', async () => {
    expect(await 확인(await 가짜요청('xfu1-dead'))).toBeNull();
  });

  it('배정받은 서비스가 없으면 빈 목록이다', async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password)
            VALUES ($1, '최없음', $2, 'member', true, false)
       ON CONFLICT (username) DO UPDATE SET is_active = true, role = 'member', perm_dashboard = 'none',
         is_approved = true, must_change_password = false`,
      ['xfu1-none', await 해시('없음')],
    );
    const user = await 확인(await 가짜요청('xfu1-none'));
    expect(user?.services).toEqual([]);
  });

  it('멤버는 서비스마다 저장된 권한 칸을 그대로 받는다', async () => {
    const user = await 확인(await 가짜요청('xfu1-live'));
    expect(user?.services.find((s) => s.prefix === 'XFS1')?.permissions).toEqual({
      cases: 'write',
      runs: 'read',
      authoring: 'none',
    });
    expect(user?.services.find((s) => s.prefix === 'XFS1B')?.permissions).toEqual({
      cases: 'read',
      runs: 'none',
      authoring: 'none',
    });
  });

  it('관리자는 저장된 칸과 상관없이 배정 서비스 전부 쓰기 · 대시보드 읽기다', async () => {
    const user = await 확인(await 가짜요청('xfu1-admin'));
    expect(user?.role).toBe('admin');
    expect(user?.dashboard).toBe('read');
    expect(user?.services.map((s) => s.permissions)).toEqual([
      { cases: 'write', runs: 'write', authoring: 'write' },
    ]);
  });

  it('배정받지 않은 서비스는 목록에 없다', async () => {
    const user = await 확인(await 가짜요청('xfu1-admin'));
    expect(user?.services.map((s) => s.prefix)).toEqual(['XFS1']);
  });

  it('비밀번호 변경 강제 여부는 칸 그대로다', async () => {
    expect((await 확인(await 가짜요청('xfu1-live')))?.mustChangePassword).toBe(false);
    expect((await 확인(await 가짜요청('xfu1-admin')))?.mustChangePassword).toBe(true);
  });

  it('멤버의 대시보드 칸은 저장된 값 그대로다', async () => {
    expect((await 확인(await 가짜요청('xfu1-live')))?.dashboard).toBe('read');
    expect((await 확인(await 가짜요청('xfu1-none')))?.dashboard).toBe('none');
  });

  it('비밀번호 해시는 확인 함수 밖으로 나가지 않는다', async () => {
    const user = await 확인(await 가짜요청('xfu1-live'));
    expect(JSON.stringify(user)).not.toContain('scrypt$');

    const 안쪽 = await 사용자와해시('xfu1-live');
    expect(안쪽?.passwordHash.startsWith('scrypt$')).toBe(true);
  });

  it('승인 대기 계정은 세션이 있어도 아무도 아니다', async () => {
    expect(await 확인(await 가짜요청('xfu1-pending'))).toBeNull();
  });

  it('승인 대기 계정은 에이전트 토큰으로도 아무도 아니다', async () => {
    const 옛이름 = process.env.AUTHORING_AGENT_USER;
    process.env.AUTHORING_AGENT_USER = 'xfu1-pending';
    try {
      const 발급 = await 에이전트토큰만들기('xfu1-pending');
      if (typeof 발급 === 'string') throw new Error(`토큰 발급 실패: ${발급}`);
      const 요청 = { session: { get: () => undefined }, headers: { authorization: `Bearer ${발급.토큰}` } };
      expect(await 확인(요청)).toBeNull();
    } finally {
      process.env.AUTHORING_AGENT_USER = 옛이름;
    }
  });

  it('출입증의 비밀번호 도장이 지금 해시와 맞으면 그 사람이다', async () => {
    const 안쪽 = await 사용자와해시('xfu1-live');
    const user = await 확인(await 가짜요청('xfu1-live', 비밀번호도장(안쪽!.passwordHash)));
    expect(user?.username).toBe('xfu1-live');
  });

  it('비밀번호가 바뀌어 도장이 안 맞으면 아무도 아니다', async () => {
    expect(await 확인(await 가짜요청('xfu1-live', 'scrypt$000000000'))).toBeNull();
  });

  it('도장이 없는 옛 출입증은 아무도 아니다 — 한 번 다시 로그인한다', async () => {
    expect(await 확인(await 가짜요청('xfu1-live', null))).toBeNull();
  });
});
