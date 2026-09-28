// 작성 이어하기 칸과 제약 검사 — 중단 이유 둘 · resume_from 은 재실행에만 · 한 중단 요청은 한 번만 (SPEC 공통/4-데이터모델 「작성 이어하기 칸」)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XRM';

describe.skipIf(연결 === undefined)('작성 이어하기 칸', () => {
  let 서비스 = 0;

  const 넣기 = async (칸: {
    kind?: string;
    sourceId?: number | null;
    status?: string;
    stopReason?: string | null;
    resumeFrom?: number | null;
  }): Promise<number> => {
    const { pool } = await import('../db/index.js');
    const 멈춤 = (칸.status ?? 'STOPPED') === 'STOPPED';
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request
         (service_id, kind, source_id, requested_by, requested_by_name, status, stop_reason, stopped_by, resume_from)
       VALUES ($1, $2, $3, 'xrm', '검사', $4, $5, $6, $7)
       RETURNING id`,
      [
        서비스,
        칸.kind ?? 'AUTHOR',
        칸.sourceId ?? null,
        칸.status ?? 'STOPPED',
        멈춤 ? (칸.stopReason ?? 'TIMEOUT') : null,
        멈춤 ? 'system' : null,
        칸.resumeFrom ?? null,
      ],
    );
    return Number(r.rows[0]!.id);
  };

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xrm')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 이어하기 칸 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it.each(['CRASH', 'REJECTED'])('중단 이유 %s 를 받는다', async (이유) => {
    await expect(넣기({ stopReason: 이유 })).resolves.toBeGreaterThan(0);
  });

  it('재실행은 멈춘 요청을 이어받을 수 있다', async () => {
    const 원본 = await 넣기({});
    await expect(
      넣기({ kind: 'RERUN', sourceId: 원본, status: 'PENDING', resumeFrom: 원본 }),
    ).resolves.toBeGreaterThan(0);
  });

  it('작성 요청에는 이어받기가 붙지 않는다', async () => {
    const 원본 = await 넣기({});
    await expect(넣기({ status: 'PENDING', resumeFrom: 원본 })).rejects.toThrow(
      'authoring_request_resume_from_check',
    );
  });

  it('한 중단 요청은 한 번만 이어받는다', async () => {
    const 원본 = await 넣기({});
    await 넣기({ kind: 'RERUN', sourceId: 원본, status: 'PENDING', resumeFrom: 원본 });
    await expect(
      넣기({ kind: 'RERUN', sourceId: 원본, status: 'PENDING', resumeFrom: 원본 }),
    ).rejects.toThrow('authoring_request_resume_from_once');
  });
});
