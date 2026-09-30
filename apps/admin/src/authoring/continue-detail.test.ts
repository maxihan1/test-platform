// 남은 요구로 이어 작성 — 상세 canContinue · continuedBy · continueFrom, 목록 줄의 continueFrom, 집기 응답 (SPEC 도메인/작성 §7)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type 판, 판차리기, 셈있음 } from './continue-fixture.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('이어 작성 — 상세 · 목록 · 집기', () => {
  let 판: 판;

  beforeAll(async () => {
    판 = await 판차리기('XWN');
  });

  afterAll(async () => {
    await 판.닫기();
  });

  it('반영이 끝나고 남은 요구가 있으면 뿌리 번호로도 머지 번호로도 이어 작성할 수 있다', async () => {
    const { 뿌리, 머지 } = await 판.원본({ coverage: 셈있음 });
    for (const 번호 of [뿌리, 머지!]) {
      const 몸 = await 판.상세(번호);
      expect(몸.canContinue).toBe(true);
      expect(몸.continuedBy).toBe(null);
    }
  });

  it('셈이 없는 옛 요청은 에이전트가 다시 세므로 이어 작성할 수 있다', async () => {
    const { 뿌리 } = await 판.원본();
    expect((await 판.상세(뿌리)).canContinue).toBe(true);
  });

  it.each([
    ['남은 요구가 없는 셈', { coverage: { ...셈있음, cased: 2, excluded: { '요구 아님': 1 }, missing: [], later: [] } }],
    ['원장이 없는 셈', { coverage: { none: 'PDF 뿐이다' } }],
    ['입력 자료가 없는 원본', { 자료: [] as ('FILE' | 'FIGMA')[] }],
    ['반영 전', { coverage: 셈있음, 최신: 'AUTHOR_DONE' as const }],
    ['반영 대기', { coverage: 셈있음, 최신: 'MERGE_PENDING' as const }],
    ['실패한 반영', { coverage: 셈있음, 최신: 'MERGE_FAILED' as const }],
  ])('%s 이면 이어 작성할 수 없다', async (_, 칸) => {
    const { 뿌리 } = await 판.원본(칸);
    expect((await 판.상세(뿌리)).canContinue).toBe(false);
  });

  it('이어 작성한 요청이 있으면 막히고 그 번호를 알려 주고, 폐기하면 다시 열린다', async () => {
    const { pool } = await import('../db/index.js');
    const { 뿌리 } = await 판.원본({ coverage: 셈있음 });
    const 이은것 = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, requested_by, requested_by_name, status, continue_from)
       VALUES ($1, 'AUTHOR', 'xcont', '검사', 'FAILED', $2) RETURNING id`,
      [판.서비스, 뿌리],
    );
    const 번호 = Number(이은것.rows[0]!.id);
    let 몸 = await 판.상세(뿌리);
    expect(몸.canContinue).toBe(false);
    expect(몸.continuedBy).toBe(번호);
    expect((await 판.상세(번호)).continueFrom).toBe(뿌리);

    await pool.query('UPDATE authoring_request SET discarded_at = now() WHERE id = $1', [번호]);
    몸 = await 판.상세(뿌리);
    expect(몸.canContinue).toBe(true);
    expect(몸.continuedBy).toBe(null);
  });

  it('목록 줄의 continueFrom 은 뿌리 것이다 — 재실행이 최신이어도', async () => {
    const { pool } = await import('../db/index.js');
    const { 뿌리 } = await 판.원본({ coverage: 셈있음 });
    const 이은것 = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO authoring_request (service_id, kind, requested_by, requested_by_name, status, continue_from)
           VALUES ($1, 'AUTHOR', 'xcont', '검사', 'FAILED', $2) RETURNING id`,
          [판.서비스, 뿌리],
        )
      ).rows[0]!.id,
    );
    await pool.query(
      `INSERT INTO authoring_request (service_id, kind, source_id, requested_by, requested_by_name, status)
       VALUES ($1, 'RERUN', $2, 'xcont', '검사', 'FAILED')`,
      [판.서비스, 이은것],
    );
    const 목록 = (
      await 판.app.inject({ method: 'GET', url: `/api/authoring/requests?service=${판.접두사}` })
    ).json<{ items: { rootId: number; kind: string; continueFrom: number | null }[] }>();
    const 줄 = 목록.items.find((x) => x.rootId === 이은것);
    expect(줄?.kind).toBe('RERUN');
    expect(줄?.continueFrom).toBe(뿌리);
    expect(목록.items.find((x) => x.rootId === 뿌리)?.continueFrom).toBe(null);
  });

  it('집기 응답에 continueFrom 이 실린다 — 에이전트가 이어 작성 모드를 안다', async () => {
    const { pool } = await import('../db/index.js');
    await pool.query("UPDATE authoring_request SET status = 'FAILED' WHERE service_id = $1 AND status = 'PENDING'", [판.서비스]);
    const { 뿌리 } = await 판.원본({ coverage: 셈있음 });
    const 새것 = Number(
      (
        await pool.query<{ id: string }>(
          `INSERT INTO authoring_request (service_id, kind, requested_by, requested_by_name, status, continue_from)
           VALUES ($1, 'AUTHOR', 'xcont', '검사', 'PENDING', $2) RETURNING id`,
          [판.서비스, 뿌리],
        )
      ).rows[0]!.id,
    );
    const 답 = await 판.app.inject({ method: 'POST', url: `/api/authoring/requests/claim?service=${판.접두사}` });
    expect(답.statusCode).toBe(200);
    expect(답.json()).toMatchObject({ id: 새것, kind: 'AUTHOR', continueFrom: 뿌리 });
  });
});
