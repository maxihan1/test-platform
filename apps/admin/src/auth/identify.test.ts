// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 확인 } from './identify.js';
import { 해시 } from './password.js';
import { 사용자와해시 } from './store.js';

const 연결 = process.env.DATABASE_URL;

function 가짜요청(username: string | undefined) {
  return { session: { get: () => username } };
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
      `INSERT INTO app_user (username, display_name, password_hash, role)
            VALUES ($1, '김확인', $2, 'operator')
       ON CONFLICT (username) DO UPDATE SET is_active = true, password_hash = EXCLUDED.password_hash`,
      ['xfu1-live', await 해시('열려라참깨')],
    );
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, is_active)
            VALUES ($1, '박비활성', $2, 'admin', false)
       ON CONFLICT (username) DO UPDATE SET is_active = false`,
      ['xfu1-dead', await 해시('아무거나')],
    );
    await pool.query(
      `INSERT INTO user_service (username, service_id) VALUES ($1, $2), ($1, $3)
       ON CONFLICT DO NOTHING`,
      ['xfu1-live', 서비스id, 웹훅없는서비스id],
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
    const user = await 확인(가짜요청('xfu1-live'));
    expect(user?.username).toBe('xfu1-live');
    expect(user?.displayName).toBe('김확인');
    expect(user?.role).toBe('operator');
    expect(user?.services.map((s) => s.prefix)).toEqual(['XFS1', 'XFS1B']);
  });

  it('배정받은 서비스마다 대상 서버 목록이 온다. 실행 설정이 읽을 통로가 여기뿐이다 (SPEC §8.2 · §7)', async () => {
    const user = await 확인(가짜요청('xfu1-live'));
    const 하나 = user?.services.find((s) => s.prefix === 'XFS1');
    expect(하나?.envs).toEqual([
      { env: 'dev', baseUrl: 'https://dev.xfs.test' },
      { env: 'qa', baseUrl: 'https://qa.xfs.test' },
    ]);
  });

  it('대상 서버가 없는 서비스는 빈 목록이다. 없는 것을 지어내지 않는다', async () => {
    const user = await 확인(가짜요청('xfu1-live'));
    expect(user?.services.find((s) => s.prefix === 'XFS1B')?.envs).toEqual([]);
  });

  it('Slack 웹훅이 설정됐는지만 알려준다', async () => {
    const user = await 확인(가짜요청('xfu1-live'));
    expect(user?.services.find((s) => s.prefix === 'XFS1')?.hasSlackWebhook).toBe(true);
    expect(user?.services.find((s) => s.prefix === 'XFS1B')?.hasSlackWebhook).toBe(false);
  });

  it('웹훅 주소 자체는 응답 어디에도 없다 (SPEC §7)', async () => {
    const user = await 확인(가짜요청('xfu1-live'));
    expect(JSON.stringify(user)).not.toContain('hooks.slack.test');
  });

  it('세션이 비어 있으면 아무도 아니다', async () => {
    expect(await 확인(가짜요청(undefined))).toBeNull();
    expect(await 확인(가짜요청(''))).toBeNull();
  });

  it('세션이 살아 있어도 계정이 비활성이면 끊긴다', async () => {
    expect(await 확인(가짜요청('xfu1-dead'))).toBeNull();
  });

  it('배정받은 서비스가 없으면 빈 목록이다', async () => {
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash, role)
            VALUES ($1, '최없음', $2, 'viewer')
       ON CONFLICT (username) DO UPDATE SET is_active = true`,
      ['xfu1-none', await 해시('없음')],
    );
    const user = await 확인(가짜요청('xfu1-none'));
    expect(user?.services).toEqual([]);
  });

  it('비밀번호 해시는 확인 함수 밖으로 나가지 않는다', async () => {
    const user = await 확인(가짜요청('xfu1-live'));
    expect(JSON.stringify(user)).not.toContain('scrypt$');

    const 안쪽 = await 사용자와해시('xfu1-live');
    expect(안쪽?.passwordHash.startsWith('scrypt$')).toBe(true);
  });
});
