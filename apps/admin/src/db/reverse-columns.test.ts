// 역방향 칸 마이그레이션이 계약 블록대로 섰는지 검사 (SPEC 공통/4-데이터모델 「역방향 칸」)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;

// fixture 접두사 XRC — authoring_request 는 자기 service_id 로만 지운다 (CLAUDE.md §3)
const 접두사 = 'XRC';

// 계약 블록의 칸 목록을 그대로 옮긴 것. 블록이 바뀌면 여기도 같이 바뀐다
const 계약칸: [string, string][] = [
  ['test_case', 'unconfirmed'],
  ['test_case', 'unconfirmed_since'],
  ['run_item', 'unconfirmed'],
  ['service_env', 'login_id'],
  ['service_env', 'login_password'],
  ['authoring_request', 'compare'],
  ['authoring_request', 'env'],
  ['authoring_request', 'start_url'],
  ['authoring_asset', 'role'],
  ['authoring_asset', 'source_asset_id'],
];

describe.skipIf(연결 === undefined)('역방향 칸', () => {
  let 서비스 = 0;

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: number }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', $3)
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 역방향 칸 검사용`, 접두사.toLowerCase()],
    );
    서비스 = Number(r.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
  });

  const 요청넣기 = async (칸: {
    kind?: string;
    sourceId?: number | null;
    compare: boolean;
    env?: string | null;
    startUrl?: string | null;
  }): Promise<number> => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request
         (service_id, kind, source_id, requested_by, requested_by_name, status, compare, env, start_url)
       VALUES ($1, $2, $3, 'xrc', '검사', 'DRAFT', $4, $5, $6)
       RETURNING id`,
      [
        서비스,
        칸.kind ?? 'AUTHOR',
        칸.sourceId ?? null,
        칸.compare,
        칸.env ?? null,
        칸.startUrl ?? null,
      ],
    );
    return Number(r.rows[0]!.id);
  };

  it('계약 블록의 칸이 전부 있다', async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name FROM information_schema.columns
        WHERE table_schema = current_schema()`,
    );
    const 있는칸 = new Set(r.rows.map((x) => `${x.table_name}.${x.column_name}`));
    expect(계약칸.filter(([표, 칸]) => !있는칸.has(`${표}.${칸}`))).toEqual([]);
  });

  describe('대조 짝', () => {
    it('대조를 안 켰는데 대상 서버가 있으면 거절한다', async () => {
      await expect(요청넣기({ compare: false, env: 'demo' })).rejects.toThrow(
        'authoring_request_compare_check',
      );
    });

    it('대조를 안 켰는데 시작 주소만 있어도 거절한다', async () => {
      await expect(요청넣기({ compare: false, startUrl: 'https://a.example/' })).rejects.toThrow(
        'authoring_request_compare_check',
      );
    });

    it('대조를 켰는데 대상 서버가 없으면 거절한다', async () => {
      await expect(요청넣기({ compare: true })).rejects.toThrow('authoring_request_compare_check');
    });

    it('대조는 재실행 요청에 붙지 않는다', async () => {
      const 원본 = await 요청넣기({ compare: false });
      await expect(
        요청넣기({ kind: 'RERUN', sourceId: 원본, compare: true, env: 'demo' }),
      ).rejects.toThrow('authoring_request_compare_check');
    });

    it('대조는 머지 요청에 붙지 않는다', async () => {
      const 원본 = await 요청넣기({ compare: false });
      await expect(
        요청넣기({ kind: 'MERGE', sourceId: 원본, compare: true, env: 'demo' }),
      ).rejects.toThrow('authoring_request_compare_check');
    });

    it('작성 요청에 대조를 켜고 대상 서버를 주면 들어간다', async () => {
      await expect(
        요청넣기({
          compare: true,
          env: 'demo',
          startUrl: 'https://a.example/',
        }),
      ).resolves.toBeGreaterThan(0);
    });
  });

  describe('자료 역할', () => {
    it('모르는 역할은 거절한다', async () => {
      const { pool } = await import('../db/index.js');
      const 요청 = await 요청넣기({ compare: false });
      await expect(
        pool.query(
          `INSERT INTO authoring_asset (request_id, position, kind, name, size, role)
           VALUES ($1, 0, 'FILE', 'a.pdf', 1, 'X')`,
          [요청],
        ),
      ).rejects.toThrow('authoring_asset_role_check');
    });

    it('역할을 안 주면 사람이 넣은 입력이다', async () => {
      const { pool } = await import('../db/index.js');
      const 요청 = await 요청넣기({ compare: false });
      const r = await pool.query<{ role: string }>(
        `INSERT INTO authoring_asset (request_id, position, kind, name, size)
         VALUES ($1, 0, 'FILE', 'a.pdf', 1) RETURNING role`,
        [요청],
      );
      expect(r.rows[0]!.role).toBe('INPUT');
    });
  });
});
