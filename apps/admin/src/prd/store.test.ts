// 표준 기획서 판 저장소 — 판 이력 · 낡은 판 거절 · 되돌리기 · 옮기기 · 기준 판 · 반영 세우기 (도메인/작성 §3.6 「★ 표준 기획서」)

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XPS';
const 사람 = { username: 'xps', displayName: '검사하는 사람' };
const 근거 = [{ from: '기획서.docx', quote: '장바구니는 20개까지' }];
const 새것 = (text: string, status: 'CONFIRMED' | 'NEEDS_CHECK' = 'CONFIRMED') => ({ feature: '장바구니', text, basis: 근거, status });

describe.skipIf(연결 === undefined)('표준 기획서 저장소', () => {
  let 서비스 = 0;
  const 케이스 = ['XPS-001', 'XPS-002'];

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 저장소 = () => import('./store.js');

  const 치우기 = async () => {
    await q('DELETE FROM req_case WHERE service_id = $1', [서비스]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스]);
    await q('UPDATE authoring_request SET prd_version = NULL WHERE service_id = $1', [서비스]);
    await q('DELETE FROM prd_version WHERE service_id = $1', [서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  };

  const 요청넣기 = async (kind: string, 칸: { source?: number; status?: string; params?: object; prd?: number } = {}) => {
    const r = await q<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, source_id, params, requested_by, requested_by_name, status, prd_version, finished_at)
       VALUES ($1, $2, $3, $4, 'xps', '검사', $5, $6, CASE WHEN $5 = 'DONE' THEN now() END) RETURNING id`,
      [서비스, kind, 칸.source ?? null, JSON.stringify(칸.params ?? {}), 칸.status ?? 'RUNNING', 칸.prd ?? null],
    );
    return Number(r.rows[0]!.id);
  };

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xps')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 표준 기획서 저장소 검사용`],
    );
    서비스 = Number(s.rows[0]!.id);
  });

  beforeEach(치우기);

  afterAll(async () => {
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('저장마다 새 판이고 낡은 판으로 저장하면 PRD_STALE', async () => {
    const s = await 저장소();
    expect(await s.사람저장(서비스, 접두사, 0, [새것('20개까지')], 사람)).toEqual({ version: 1 });
    expect(await s.사람저장(서비스, 접두사, 0, [새것('30개까지')], 사람)).toEqual({ error: 'PRD_STALE', latest: 1 });
    expect(await s.사람저장(서비스, 접두사, 1, [{ ...새것('30개까지'), reqId: 'XPS-REQ-001' }], 사람)).toEqual({ version: 2 });
    expect((await s.지금판(서비스))?.items).toMatchObject([{ reqId: 'XPS-REQ-001', text: '30개까지', byPerson: true }]);
    expect((await s.판목록(서비스)).map((x) => [x.version, x.source, x.savedByName])).toEqual([
      [2, 'PERSON', '검사하는 사람'],
      [1, 'PERSON', '검사하는 사람'],
    ]);
  });

  it('DB 에서 읽은 판을 그대로 다시 보내면 새 판을 안 만든다', async () => {
    const s = await 저장소();
    await s.사람저장(서비스, 접두사, 0, [{ ...새것('20개까지'), basis: [{ from: '기획서.docx', ref: 'REQ-9', quote: '20개' }] }], 사람);
    const 지금 = await s.지금판(서비스);
    expect(await s.사람저장(서비스, 접두사, 1, 지금!.items, 사람)).toEqual({ version: 1 });
  });

  it('일괄 확정과 되돌리기도 새 판이다 — 되돌린 판은 옛 판 항목을 복사한다', async () => {
    const s = await 저장소();
    await s.사람저장(서비스, 접두사, 0, [새것('20개까지', 'NEEDS_CHECK')], 사람);
    expect(await s.일괄확정(서비스, 1, ['XPS-REQ-001'], 사람)).toEqual({ version: 2 });
    expect((await s.지금판(서비스))?.items[0]).toMatchObject({ status: 'CONFIRMED', byPerson: true });
    expect(await s.되돌리기(서비스, 접두사, 2, 1, 사람)).toEqual({ version: 3 });
    expect((await s.지금판(서비스))?.items[0]).toMatchObject({ status: 'NEEDS_CHECK' });
    expect((await s.판목록(서비스))[0]?.source).toBe('REVERT');
    expect(await s.되돌리기(서비스, 접두사, 3, 99, 사람)).toBeNull();
  });

  it('옮기기는 AGENT 판을 넣고 요청의 읽은 판을 바꾼다. 끝난 요청이면 NOT_RUNNING', async () => {
    const s = await 저장소();
    const 요청 = await 요청넣기('AUTHOR');
    expect(await s.옮기기(요청, 서비스, 접두사, 0, [새것('20개까지')], 사람)).toEqual({ version: 1, keptByPerson: [] });
    const 행 = await q<{ prd_version: number }>('SELECT prd_version FROM authoring_request WHERE id = $1', [요청]);
    expect(행.rows[0]?.prd_version).toBe(1);
    expect((await s.판목록(서비스))[0]?.source).toBe('AGENT');
    const 끝난것 = await 요청넣기('AUTHOR', { status: 'DONE' });
    expect(await s.옮기기(끝난것, 서비스, 접두사, 1, [], 사람)).toEqual({ error: 'NOT_RUNNING' });
  });

  it('기준 판은 가장 최근에 병합된 반영이 병합한 작성 실행이 읽은 판이다. 없으면 전부 반영 안 됨', async () => {
    const s = await 저장소();
    expect(await s.반영세우기(서비스, 사람)).toEqual({ error: 'NOTHING_TO_APPLY' });
    await s.사람저장(서비스, 접두사, 0, [새것('20개까지')], 사람);
    expect(await s.기준판(서비스)).toBeNull();
    const 뿌리 = await 요청넣기('AUTHOR', { status: 'DONE', prd: 1 });
    await 요청넣기('MERGE', { source: 뿌리, status: 'DONE' });
    expect(await s.기준판(서비스)).toMatchObject([{ reqId: 'XPS-REQ-001' }]);
    expect(await s.반영세우기(서비스, 사람)).toEqual({ error: 'NOTHING_TO_APPLY' });

    await s.사람저장(서비스, 접두사, 1, [{ ...새것('30개까지'), reqId: 'XPS-REQ-001' }], 사람);
    const 세움 = await s.반영세우기(서비스, 사람);
    expect(세움).toHaveProperty('id');
    const 행 = await q<{ kind: string; status: string; params: object; source_id: string | null }>(
      'SELECT kind, status, params, source_id FROM authoring_request WHERE id = $1',
      ['id' in 세움 ? 세움.id : 0],
    );
    expect(행.rows[0]).toEqual({ kind: 'AUTHOR', status: 'PENDING', params: { prdApply: true }, source_id: null });
  });

  it('케이스 고치기의 병합은 기준이 못 된다', async () => {
    const s = await 저장소();
    await s.사람저장(서비스, 접두사, 0, [새것('20개까지')], 사람);
    const 고치기 = await 요청넣기('EDIT', { status: 'DONE', params: { edits: [] } });
    const 다시적용 = await 요청넣기('RERUN', { source: 고치기, status: 'DONE', params: { edits: [] } });
    await 요청넣기('MERGE', { source: 다시적용, status: 'DONE' });
    expect(await s.기준판(서비스)).toBeNull();
  });

  it('지도 ① 은 활성 케이스만 번호마다 묶는다', async () => {
    const s = await 저장소();
    for (const [tc, 활성] of [['XPS-001', true], ['XPS-002', false]] as const) {
      await q(
        `INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema, is_active, techniques)
         VALUES ($1, '검사', 'tests/xps/a.spec.ts', '{}', '{}', $2, '{경계값 분석}')`,
        [tc, 활성],
      );
    }
    await q(
      `INSERT INTO req_case (service_id, req_id, tc_id, axis) VALUES
         ($1, 'XPS-REQ-001', 'XPS-001', '경계'), ($1, 'XPS-REQ-001', 'XPS-002', '정상'), ($1, 'XPS-REQ-009', 'XPS-001', '정상')`,
      [서비스],
    );
    expect(await s.케이스지도(서비스)).toEqual({
      'XPS-REQ-001': [{ tcId: 'XPS-001', axis: '경계', techniques: ['경계값 분석'] }],
      'XPS-REQ-009': [{ tcId: 'XPS-001', axis: '정상', techniques: ['경계값 분석'] }],
    });
  });
});
