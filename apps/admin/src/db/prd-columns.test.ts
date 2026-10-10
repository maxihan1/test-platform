// 표준 기획서 판 표의 짝 제약과 작성 요청의 읽은 판 외래 키를 지키는 검사 (공통/4-데이터모델 「표준 기획서 · 지도 · 화면 기록 표」)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XPV';

describe.skipIf(연결 === undefined)('표준 기획서 판 칸', () => {
  let 서비스 = 0;
  let 요청 = 0;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  const 치우기 = async () => {
    await q('UPDATE authoring_request SET prd_version = NULL WHERE service_id = $1', [서비스]);
    await q('DELETE FROM prd_version WHERE service_id = $1', [서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  };

  const 판넣기 = (version: number, source: string, requestId: number | null) =>
    q(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, request_id, saved_by, saved_by_name)
       VALUES ($1, $2, '[]', 0, $3, $4, 'xpv', '검사')`,
      [서비스, version, source, requestId],
    );

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xpv')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 표준 기획서 칸 검사용`],
    );
    서비스 = Number(s.rows[0]!.id);
    await 치우기();
    const r = await q<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status)
       VALUES ($1, 'AUTHOR', '{}', 'xpv', '검사', 'RUNNING') RETURNING id`,
      [서비스],
    );
    요청 = Number(r.rows[0]!.id);
  });

  afterAll(async () => {
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('옮기기 판에만 작성 요청 번호가 붙는다', async () => {
    await expect(판넣기(1, 'AGENT', null)).rejects.toThrow(/prd_version_check/);
    await expect(판넣기(1, 'PERSON', 요청)).rejects.toThrow(/prd_version_check/);
    await 판넣기(1, 'AGENT', 요청);
    await 판넣기(2, 'PERSON', null);
  });

  it('작성 요청의 읽은 판은 그 서비스에 있는 판만 가리킨다', async () => {
    await expect(q('UPDATE authoring_request SET prd_version = 99 WHERE id = $1', [요청])).rejects.toThrow(
      /authoring_request_prd_version_fkey/,
    );
    await q('UPDATE authoring_request SET prd_version = 2 WHERE id = $1', [요청]);
  });
});
