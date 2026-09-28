// 권한 칸 마이그레이션이 계약 블록대로 섰고 옛 등급을 그대로 옮기는지 검사 (SPEC 공통/4-데이터모델 §6 「등급 셋을 기능별 권한으로」)

import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;

// fixture 접두사 — 계정 xfu8 · 서비스 XFS8 (CLAUDE.md §3)
const 계정 = 'xfu8';
const 접두사 = 'XFS8';

const 파일 = readFileSync(
  new URL('../../../../db/migrations/20260928000001_permissions.sql', import.meta.url),
  'utf8',
);
const 올리기 = 파일.split('-- migrate:down')[0] ?? '';
const 옮기기 = (() => {
  const 시작 = 올리기.indexOf('-- 옮기기 시작');
  const 끝 = 올리기.indexOf('-- 옮기기 끝');
  return 시작 < 0 || 끝 < 0 ? '' : 올리기.slice(시작, 끝);
})();

describe.skipIf(연결 === undefined)('권한 칸', () => {
  let 서비스: number[] = [];

  const 치우기 = async (): Promise<void> => {
    const { pool } = await import('../db/index.js');
    await pool.query(`DELETE FROM user_service WHERE username LIKE 'xfu8%'`);
    await pool.query(`DELETE FROM app_user WHERE username LIKE 'xfu8%'`);
    await pool.query(`DELETE FROM service WHERE prefix LIKE 'XFS8%'`);
  };

  beforeAll(async () => {
    await 치우기();
    const { pool } = await import('../db/index.js');
    서비스 = [];
    for (const 끝 of ['A', 'B']) {
      const r = await pool.query<{ id: string }>(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
         VALUES ($1, $2, '#3A5FCD', '', $3) RETURNING id`,
        [`${접두사}${끝}`, `${접두사}${끝} 권한 칸 검사용`, `${접두사}${끝}`.toLowerCase()],
      );
      서비스.push(Number(r.rows[0]!.id));
    }
  });

  afterAll(치우기);

  describe('옛 등급 옮기기 (옛 모양의 임시 표에 옮기기 구간을 돌린다)', () => {
    type 행 = { username: string; role: string; perm_dashboard: string; is_approved: boolean; must_change_password: boolean };
    type 배정 = { username: string; perm_cases: string; perm_runs: string; perm_authoring: string };
    let 사람: 행[] = [];
    let 배정들: 배정[] = [];

    beforeAll(async () => {
      expect(옮기기).not.toBe('');
      const { pool } = await import('../db/index.js');
      const c = await pool.connect();
      try {
        // 칸을 더한 직후의 모양 — 기본값은 옛 행을 채우는 쪽(read · true · false)이다
        await c.query(`CREATE TEMP TABLE app_user (
          username TEXT PRIMARY KEY, role TEXT NOT NULL,
          perm_dashboard TEXT NOT NULL DEFAULT 'read',
          is_approved BOOLEAN NOT NULL DEFAULT true,
          must_change_password BOOLEAN NOT NULL DEFAULT false)`);
        await c.query(`CREATE TEMP TABLE user_service (
          username TEXT NOT NULL, service_id BIGINT NOT NULL,
          perm_cases TEXT NOT NULL DEFAULT 'read',
          perm_runs TEXT NOT NULL DEFAULT 'read',
          perm_authoring TEXT NOT NULL DEFAULT 'read')`);
        await c.query(`INSERT INTO pg_temp.app_user (username, role)
                       VALUES ('v', 'viewer'), ('o', 'operator'), ('a', 'admin')`);
        await c.query(`INSERT INTO pg_temp.user_service (username, service_id)
                       VALUES ('v', 1), ('v', 2), ('o', 1), ('o', 2), ('a', 1)`);
        // 임시 표가 진짜 표를 가린다 — 옮기기 구간은 이름을 한정하지 않고 쓴다
        await c.query('SET search_path = pg_temp, public');
        await c.query(옮기기);
        사람 = (await c.query<행>('SELECT * FROM pg_temp.app_user')).rows;
        배정들 = (await c.query<배정>('SELECT * FROM pg_temp.user_service')).rows;
      } finally {
        await c.query('DROP TABLE IF EXISTS pg_temp.app_user, pg_temp.user_service');
        await c.query('RESET search_path');
        c.release();
      }
    });

    const 칸 = (이름: string): string[][] =>
      배정들.filter((x) => x.username === 이름).map((x) => [x.perm_cases, x.perm_runs, x.perm_authoring]);
    const 한사람 = (이름: string): 행 | undefined => 사람.find((x) => x.username === 이름);

    it('viewer 는 배정된 서비스마다 셋 다 read', () => {
      expect(칸('v')).toEqual([['read', 'read', 'read'], ['read', 'read', 'read']]);
    });

    it('operator 는 배정된 서비스마다 셋 다 write', () => {
      expect(칸('o')).toEqual([['write', 'write', 'write'], ['write', 'write', 'write']]);
    });

    it('admin 은 admin 그대로, 서비스 행은 셋 다 write', () => {
      expect(한사람('a')?.role).toBe('admin');
      expect(칸('a')).toEqual([['write', 'write', 'write']]);
    });

    it('viewer · operator 는 member 가 된다', () => {
      expect(한사람('v')?.role).toBe('member');
      expect(한사람('o')?.role).toBe('member');
    });

    it('셋 다 대시보드 read · 승인됨 · 비밀번호 변경 강제 없음', () => {
      expect(사람.map((x) => [x.perm_dashboard, x.is_approved, x.must_change_password])).toEqual([
        ['read', true, false],
        ['read', true, false],
        ['read', true, false],
      ]);
    });
  });

  describe('옛 행을 채우는 기본값이 좁은 기본값보다 먼저다', () => {
    const 앞에 = (앞: RegExp, 뒤: RegExp): boolean => {
      const i = 올리기.search(앞);
      const j = 올리기.search(뒤);
      return i >= 0 && j >= 0 && i < j;
    };

    it.each([
      [/perm_dashboard\s+TEXT\s+NOT NULL\s+DEFAULT 'read'/, /perm_dashboard\s+SET DEFAULT 'none'/],
      [/is_approved\s+BOOLEAN\s+NOT NULL\s+DEFAULT true/, /is_approved\s+SET DEFAULT false/],
      [/must_change_password\s+BOOLEAN\s+NOT NULL\s+DEFAULT false/, /must_change_password\s+SET DEFAULT true/],
      [/perm_cases\s+TEXT\s+NOT NULL\s+DEFAULT 'read'/, /perm_cases\s+SET DEFAULT 'none'/],
    ])('%s 가 %s 보다 앞', (앞, 뒤) => {
      expect(앞에(앞, 뒤)).toBe(true);
    });
  });

  describe('마이그레이션한 DB', () => {
    const 계정넣기 = async (이름: string, 칸: Record<string, string> = {}): Promise<void> => {
      const { pool } = await import('../db/index.js');
      const 키 = Object.keys(칸);
      await pool.query(
        `INSERT INTO app_user (username, display_name, password_hash${키.map((k) => `, ${k}`).join('')})
         VALUES ($1, '검사', 'x'${키.map((_, i) => `, $${i + 2}`).join('')})`,
        [이름, ...Object.values(칸)],
      );
    };

    it('대시보드에 write 는 못 들어간다', async () => {
      await expect(계정넣기(`${계정}w`, { perm_dashboard: 'write' })).rejects.toThrow('app_user_perm_dashboard_check');
    });

    it('옛 등급 viewer 는 못 들어간다', async () => {
      await expect(계정넣기(`${계정}v`, { role: 'viewer' })).rejects.toThrow('app_user_role_check');
    });

    it('칸을 안 주면 가장 좁은 쪽이다', async () => {
      const { pool } = await import('../db/index.js');
      await 계정넣기(`${계정}n`);
      const r = await pool.query(
        `SELECT role, perm_dashboard, is_approved, must_change_password FROM app_user WHERE username = $1`,
        [`${계정}n`],
      );
      expect(r.rows[0]).toEqual({
        role: 'member',
        perm_dashboard: 'none',
        is_approved: false,
        must_change_password: true,
      });
    });

    it('셋 다 none 인 배정은 못 들어간다', async () => {
      const { pool } = await import('../db/index.js');
      await 계정넣기(`${계정}s`);
      await expect(
        pool.query(
          `INSERT INTO user_service (username, service_id, perm_cases, perm_runs, perm_authoring)
           VALUES ($1, $2, 'none', 'none', 'none')`,
          [`${계정}s`, 서비스[0]],
        ),
      ).rejects.toThrow('user_service_perm_check');
    });

    it('권한 칸을 안 준 배정도 셋 다 none 이라 못 들어간다', async () => {
      const { pool } = await import('../db/index.js');
      await 계정넣기(`${계정}d`);
      await expect(
        pool.query(`INSERT INTO user_service (username, service_id) VALUES ($1, $2)`, [`${계정}d`, 서비스[1]]),
      ).rejects.toThrow('user_service_perm_check');
    });

    it('한 칸이라도 있으면 들어간다', async () => {
      const { pool } = await import('../db/index.js');
      await 계정넣기(`${계정}k`);
      await expect(
        pool.query(`INSERT INTO user_service (username, service_id, perm_runs) VALUES ($1, $2, 'write')`, [
          `${계정}k`,
          서비스[0],
        ]),
      ).resolves.toBeDefined();
    });
  });
});
