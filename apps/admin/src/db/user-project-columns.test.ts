// 권한을 프로젝트마다 주는 표(user_project)와 옛 user_service 에서 옮기는 구간 검사 (SPEC 공통/4-데이터모델 「프로젝트 표」 · PRJ-F1-02b)

import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;

// fixture 이름 — 계정 xup · 프로젝트 이름 「XUP 프로젝트」 (apps/admin/CLAUDE.md)
const 프로젝트이름 = 'XUP 프로젝트';

const 올리기 = readFileSync(new URL('../../../../db/migrations/20261019000005_user_project.sql', import.meta.url), 'utf8').split(
  '-- migrate:down',
)[0]!;
const 옮기기 = 올리기.slice(올리기.indexOf('-- 옮기기 시작'), 올리기.indexOf('-- 옮기기 끝'));

describe.skipIf(연결 === undefined)('프로젝트 권한 표', () => {
  let 프로젝트: number[] = [];

  const 치우기 = async (): Promise<void> => {
    const { pool } = await import('../db/index.js');
    await pool.query(`DELETE FROM user_project WHERE username LIKE 'xup%'`);
    await pool.query(`DELETE FROM app_user WHERE username LIKE 'xup%'`);
    await pool.query('DELETE FROM project WHERE name = $1', [프로젝트이름]);
  };

  const 계정넣기 = async (이름: string): Promise<void> => {
    const { pool } = await import('../db/index.js');
    await pool.query(`INSERT INTO app_user (username, display_name, password_hash) VALUES ($1, '검사', 'x')`, [이름]);
  };

  beforeAll(async () => {
    await 치우기();
    const { pool } = await import('../db/index.js');
    프로젝트 = [];
    for (let i = 0; i < 2; i += 1) {
      const r = await pool.query<{ id: string }>('INSERT INTO project (name) VALUES ($1) RETURNING id', [프로젝트이름]);
      프로젝트.push(Number(r.rows[0]!.id));
    }
  });

  afterAll(치우기);

  describe('옛 user_service 옮기기 (옛 모양의 임시 표에 옮기기 구간을 돌린다)', () => {
    type 배정 = { username: string; project_id: string; perm_cases: string; perm_runs: string; perm_authoring: string };
    let 배정들: 배정[] = [];

    beforeAll(async () => {
      expect(옮기기).not.toBe('');
      const { pool } = await import('../db/index.js');
      const c = await pool.connect();
      try {
        await c.query('CREATE TEMP TABLE service (id BIGINT PRIMARY KEY, project_id BIGINT NOT NULL)');
        await c.query(`CREATE TEMP TABLE user_service (
          username TEXT NOT NULL, service_id BIGINT NOT NULL,
          perm_cases TEXT NOT NULL, perm_runs TEXT NOT NULL, perm_authoring TEXT NOT NULL)`);
        await c.query(`CREATE TEMP TABLE user_project (
          username TEXT NOT NULL, project_id BIGINT NOT NULL,
          perm_cases TEXT NOT NULL, perm_runs TEXT NOT NULL, perm_authoring TEXT NOT NULL)`);
        // 서비스 1 은 프로젝트 10 · 서비스 2 와 3 은 프로젝트 11 · 서비스 4 는 프로젝트 12
        await c.query('INSERT INTO pg_temp.service VALUES (1, 10), (2, 11), (3, 11), (4, 12)');
        await c.query(`INSERT INTO pg_temp.user_service VALUES
          ('a', 1, 'write', 'read', 'none'),
          ('b', 2, 'read', 'none', 'none'), ('b', 3, 'none', 'write', 'read'),
          ('c', 1, 'read', 'read', 'read'), ('c', 4, 'none', 'write', 'none')`);
        await c.query('SET search_path = pg_temp, public');
        await c.query(옮기기);
        배정들 = (await c.query<배정>('SELECT * FROM pg_temp.user_project ORDER BY username, project_id')).rows;
      } finally {
        await c.query('DROP TABLE IF EXISTS pg_temp.service, pg_temp.user_service, pg_temp.user_project');
        await c.query('RESET search_path');
        c.release();
      }
    });

    const 칸 = (이름: string): string[][] =>
      배정들.filter((x) => x.username === 이름).map((x) => [x.project_id, x.perm_cases, x.perm_runs, x.perm_authoring]);

    it('프로젝트 하나에 한 줄이면 그 줄이 그대로 간다', () => {
      expect(칸('a')).toEqual([['10', 'write', 'read', 'none']]);
    });

    it('같은 프로젝트에 여러 줄이면 칸마다 높은 쪽을 가져간다', () => {
      expect(칸('b')).toEqual([['11', 'read', 'write', 'read']]);
    });

    it('다른 프로젝트의 줄은 프로젝트마다 따로 간다', () => {
      expect(칸('c')).toEqual([
        ['10', 'read', 'read', 'read'],
        ['12', 'none', 'write', 'none'],
      ]);
    });
  });

  describe('마이그레이션한 DB', () => {
    it('옛 표는 없다', async () => {
      const { pool } = await import('../db/index.js');
      const r = await pool.query(`SELECT 1 FROM pg_tables WHERE tablename = 'user_service'`);
      expect(r.rowCount).toBe(0);
    });

    it('셋 다 none 인 배정은 못 들어간다', async () => {
      const { pool } = await import('../db/index.js');
      await 계정넣기('xup-none');
      await expect(
        pool.query(
          `INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring)
           VALUES ('xup-none', $1, 'none', 'none', 'none')`,
          [프로젝트[0]],
        ),
      ).rejects.toThrow('user_project_perm_check');
      await expect(pool.query(`INSERT INTO user_project (username, project_id) VALUES ('xup-none', $1)`, [프로젝트[0]])).rejects.toThrow(
        'user_project_perm_check',
      );
    });

    it('프로젝트가 지워지면 그 프로젝트의 권한 줄도 같이 지워진다', async () => {
      const { pool } = await import('../db/index.js');
      await 계정넣기('xup-cascade');
      await pool.query(`INSERT INTO user_project (username, project_id, perm_runs) VALUES ('xup-cascade', $1, 'write')`, [프로젝트[1]]);
      await pool.query('DELETE FROM project WHERE id = $1', [프로젝트[1]]);
      const r = await pool.query(`SELECT 1 FROM user_project WHERE username = 'xup-cascade'`);
      expect(r.rowCount).toBe(0);
    });
  });
});
