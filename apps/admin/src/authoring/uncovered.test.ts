// 대조 병합이 끝나면 기획서에 없는 화면 작성 요청이 선다 — 끝내기 · 조건 · 한 번만 · 목록 · 상세의 uncoveredOf (SPEC 도메인/작성 §3.6 「기획서에 없는 화면 — 두 번째 작성」)

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { type 판, 판차리기, 셈있음 } from './continue-fixture.js';
import { 기획서밖화면세우기 } from './uncovered.js';

const 연결 = process.env.DATABASE_URL;
const 다찬셈 = { ...셈있음, cased: 3, excluded: {}, missing: [], later: [] };

interface 줄 {
  id: string;
  kind: string;
  status: string;
  params: unknown;
  compare: boolean;
  env: string | null;
  start_url: string | null;
  requested_by: string;
  requested_by_name: string;
}

describe.skipIf(연결 === undefined)('기획서에 없는 화면 — 두 번째 작성', () => {
  let 판: 판;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  /** 반영(MERGE)을 도는 중으로 만들고 에이전트가 끝낸다 */
  const 병합끝내기 = async (머지: number, status: 'DONE' | 'FAILED' = 'DONE') => {
    await q("UPDATE authoring_request SET status = 'RUNNING', claimed_by = $2, started_at = now() WHERE id = $1", [머지, 판.에이전트]);
    return 판.app.inject({
      method: 'POST',
      url: `/api/authoring/requests/${머지}/finish?service=${판.접두사}`,
      payload: status === 'DONE' ? { status } : { status, error: '병합 실패' },
    });
  };
  const 세운것 = async (뿌리: number) =>
    (await q<줄>(
      `SELECT id, kind, status, params, compare, env, start_url, requested_by, requested_by_name
         FROM authoring_request WHERE service_id = $1 AND params->>'uncoveredOf' = $2::text ORDER BY id`,
      [판.서비스, String(뿌리)],
    )).rows;
  const 원본 = (칸: Parameters<판['원본']>[0] = {}) => 판.원본({ compare: true, coverage: 다찬셈, 최신: 'MERGE_PENDING', ...칸 });

  beforeAll(async () => {
    판 = await 판차리기('XWZ');
  });

  afterEach(async () => {
    await q("UPDATE authoring_request SET discarded_at = now() WHERE service_id = $1 AND params ? 'uncoveredOf' AND discarded_at IS NULL", [판.서비스]);
  });

  afterAll(async () => {
    await 판.닫기();
  });

  it('남은 요구 없이 병합되면 자료 없는 화면만 요청을 대기로 세우고 대상 서버 줄을 물려받는다', async () => {
    const { 뿌리, 머지 } = await 원본();
    expect((await 병합끝내기(머지!)).statusCode).toBe(200);
    const 줄들 = await 세운것(뿌리);
    expect(줄들).toHaveLength(1);
    expect(줄들[0]).toMatchObject({
      kind: 'AUTHOR',
      status: 'PENDING',
      params: { uncoveredOf: 뿌리 },
      compare: true,
      env: 'qa',
      start_url: `https://qa.xwz.test/start`,
      requested_by: 'xcont',
      requested_by_name: '이어 작성 검사',
    });
    const 자료 = await q('SELECT 1 FROM authoring_asset WHERE request_id = $1', [Number(줄들[0]!.id)]);
    expect(자료.rowCount).toBe(0);
  });

  it.each([
    ['셈이 없는 옛 요청', { coverage: undefined }],
    ['원장이 없는 셈', { coverage: { none: 'PDF 뿐이다' } }],
  ])('%s 도 선다 — 남은 것을 모른다', async (_, 칸) => {
    const { 뿌리, 머지 } = await 원본(칸);
    await 병합끝내기(머지!);
    expect(await 세운것(뿌리)).toHaveLength(1);
  });

  it.each([
    ['남은 요구가 있는 병합', { coverage: 셈있음 }],
    ['대조가 아닌 정방향', { compare: false }],
    ['입력 자료가 없는 화면만 뿌리', { 자료: [] as ('FILE' | 'FIGMA')[] }],
    ['반영 뿌리', { params: { prdApply: true } }],
  ])('%s 는 안 세운다', async (_, 칸) => {
    const { 뿌리, 머지 } = await 원본(칸);
    expect((await 병합끝내기(머지!)).statusCode).toBe(200);
    expect(await 세운것(뿌리)).toEqual([]);
  });

  it('이미 열린 화면만 요청이 있으면 안 세운다', async () => {
    const 사람 = await q<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, compare, env)
       VALUES ($1, 'AUTHOR', '{}', 'xwz', '검사', 'PENDING', true, 'qa') RETURNING id`,
      [판.서비스],
    );
    try {
      const { 뿌리, 머지 } = await 원본();
      expect((await 병합끝내기(머지!)).statusCode).toBe(200);
      expect(await 세운것(뿌리)).toEqual([]);
    } finally {
      await q('UPDATE authoring_request SET discarded_at = now() WHERE id = $1', [Number(사람.rows[0]!.id)]);
    }
  });

  it('병합이 실패하면 안 세운다', async () => {
    const { 뿌리, 머지 } = await 원본();
    await 병합끝내기(머지!, 'FAILED');
    expect(await 세운것(뿌리)).toEqual([]);
  });

  it('폐기 안 된 요청이 있으면 두 번 안 서고, 폐기하면 다시 선다', async () => {
    const { 뿌리, 머지 } = await 원본();
    await 병합끝내기(머지!);
    const 쓰기 = async () => {
      const { pool } = await import('../db/index.js');
      const 손 = await pool.connect();
      try {
        return await 기획서밖화면세우기(손, 뿌리);
      } finally {
        손.release();
      }
    };
    expect(await 쓰기()).toBeNull();
    expect(await 세운것(뿌리)).toHaveLength(1);
    await q('UPDATE authoring_request SET discarded_at = now() WHERE id = $1', [Number((await 세운것(뿌리))[0]!.id)]);
    expect(await 쓰기()).not.toBeNull();
    expect(await 세운것(뿌리)).toHaveLength(2);
  });

  it('목록 줄과 상세는 뿌리 params.uncoveredOf 를 싣고, 숫자가 아니면 null 이다', async () => {
    const { 뿌리, 머지 } = await 원본();
    await 병합끝내기(머지!);
    const 새 = Number((await 세운것(뿌리))[0]!.id);
    expect((await 판.상세(새)).uncoveredOf).toBe(뿌리);
    expect((await 판.상세(뿌리)).uncoveredOf).toBeNull();
    const 목록 = async () =>
      ((await 판.app.inject({ method: 'GET', url: `/api/authoring/requests?service=${판.접두사}` })).json() as { items: { rootId: number; uncoveredOf: number | null }[] }).items;
    expect((await 목록()).find((x) => x.rootId === 새)?.uncoveredOf).toBe(뿌리);
    expect((await 목록()).find((x) => x.rootId === 뿌리)?.uncoveredOf).toBeNull();

    await q(`UPDATE authoring_request SET params = '{"uncoveredOf": "abc"}' WHERE id = $1`, [새]);
    expect((await 판.상세(새)).uncoveredOf).toBeNull();
    expect((await 목록()).find((x) => x.rootId === 새)?.uncoveredOf).toBeNull();
  });
});
