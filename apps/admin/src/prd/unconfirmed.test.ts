// 미확정 계산 — 지도 ① 과 표준 기획서 지금 판에서, 판에 없는 케이스는 꼬리표로 (도메인/작성 §3.6 「★ 표준 기획서」 「미확정」)

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 미확정사유SQL } from './unconfirmed.js';

const 연결 = process.env.DATABASE_URL;
const 근거 = [{ from: '기획서.docx', quote: '장바구니는 20개까지' }];
const 항목 = (reqId: string, status: 'CONFIRMED' | 'NEEDS_CHECK', 사람 = false) => ({
  reqId, feature: '장바구니', text: reqId, basis: 근거, status, ...(사람 ? { byPerson: true } : {}),
});

describe.skipIf(연결 === undefined)('미확정사유SQL', () => {
  let 서비스 = 0;
  const 케이스 = ['XUN-FN-001', 'XUN-FN-002', 'XUN-FN-003', 'XUN-FN-004'];

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 사유들 = async () =>
    Object.fromEntries(
      (await q<{ tc_id: string; 사유: string | null }>(
        `SELECT c.tc_id, ${미확정사유SQL('c')} AS 사유 FROM test_case c WHERE c.tc_id = ANY($1) ORDER BY c.tc_id`,
        [케이스],
      )).rows.map((r) => [r.tc_id, r.사유]),
    );
  const 판넣기 = async (version: number, items: object[]) =>
    q(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name)
       VALUES ($1, $2, $3, 9, 'PERSON', 'xun', '검사')`,
      [서비스, version, JSON.stringify(items)],
    );
  const 지도 = async (줄들: [string, string][]) => {
    for (const [req, tc] of 줄들) {
      await q(`INSERT INTO req_case (service_id, req_id, tc_id, axis) VALUES ($1, $2, $3, '정상')`, [서비스, req, tc]);
    }
  };

  const 치우기 = async () => {
    await q('DELETE FROM req_case WHERE service_id = $1', [서비스]);
    await q('DELETE FROM prd_version WHERE service_id = $1', [서비스]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스]);
  };

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
       VALUES ('XUN', 'XUN 미확정 계산 검사용', '#888888', '', 'xun') RETURNING id`,
    );
    서비스 = Number(s.rows[0]!.id);
  });

  beforeEach(async () => {
    await 치우기();
    for (const [tc, 꼬리표] of [
      ['XUN-FN-001', null],
      ['XUN-FN-002', '화면에만 있는 규칙이다'],
      ['XUN-FN-003', '화면에만 있는 규칙이다'],
      ['XUN-FN-004', null],
    ] as const) {
      await q(
        `INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema, is_active, unconfirmed)
         VALUES ($1, '검사', 'tests/xun/a.spec.ts', '{}', '{}', true, $2)`,
        [tc, 꼬리표],
      );
    }
  });

  afterAll(async () => {
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('덮는 요구 가운데 지금 판에서 확인 필요인 번호들이 사유다 — 꼬리표가 있어도', async () => {
    await 판넣기(1, [항목('XUN-REQ-001', 'NEEDS_CHECK'), 항목('XUN-REQ-002', 'NEEDS_CHECK'), 항목('XUN-REQ-003', 'CONFIRMED')]);
    await 지도([
      ['XUN-REQ-002', 'XUN-FN-001'],
      ['XUN-REQ-001', 'XUN-FN-001'],
      ['XUN-REQ-003', 'XUN-FN-001'],
      ['XUN-REQ-001', 'XUN-FN-002'],
    ]);
    expect(await 사유들()).toMatchObject({
      'XUN-FN-001': '확인 필요 — XUN-REQ-001 · XUN-REQ-002',
      'XUN-FN-002': '확인 필요 — XUN-REQ-001',
    });
  });

  it('덮는 요구가 다 확정이어도 사람이 확정한 것이 없으면 꼬리표를 따른다 — 이어 작성의 화면 규칙 줄이 가까운 확정 요구에 붙는다', async () => {
    await 판넣기(1, [항목('XUN-REQ-001', 'CONFIRMED'), 항목('XUN-REQ-002', 'CONFIRMED', true)]);
    await 지도([
      ['XUN-REQ-001', 'XUN-FN-002'],
      ['XUN-REQ-002', 'XUN-FN-003'],
      ['XUN-REQ-001', 'XUN-FN-004'],
    ]);
    expect(await 사유들()).toMatchObject({
      'XUN-FN-002': '화면에만 있는 규칙이다',
      'XUN-FN-003': null,
      'XUN-FN-004': null,
    });
  });

  it('「PRD 관리」에서 사람이 확정하면 다음 판부터 꼬리표가 있어도 확정이다 — 옛 판은 안 본다', async () => {
    await 판넣기(1, [항목('XUN-REQ-001', 'NEEDS_CHECK')]);
    await 지도([['XUN-REQ-001', 'XUN-FN-001'], ['XUN-REQ-001', 'XUN-FN-002']]);
    expect((await 사유들())['XUN-FN-002']).toBe('확인 필요 — XUN-REQ-001');
    await 판넣기(2, [항목('XUN-REQ-001', 'CONFIRMED', true)]);
    expect(await 사유들()).toMatchObject({ 'XUN-FN-001': null, 'XUN-FN-002': null });
  });

  it('지금 판에 덮는 요구가 하나도 없으면 꼬리표를 따른다 — 옛 표 번호 · 지도 밖 · 판에서 지운 번호', async () => {
    await 판넣기(1, [항목('XUN-REQ-001', 'CONFIRMED')]);
    await 판넣기(2, [항목('XUN-REQ-002', 'CONFIRMED')]);
    await 지도([
      ['REQ-COM-006', 'XUN-FN-002'],
      ['XUN-REQ-001', 'XUN-FN-004'],
    ]);
    expect(await 사유들()).toEqual({
      'XUN-FN-001': null,
      'XUN-FN-002': '화면에만 있는 규칙이다',
      'XUN-FN-003': '화면에만 있는 규칙이다',
      'XUN-FN-004': null,
    });
  });

  it('표준 기획서가 없는 서비스도 꼬리표를 따른다', async () => {
    await 지도([['XUN-REQ-001', 'XUN-FN-003']]);
    expect((await 사유들())['XUN-FN-003']).toBe('화면에만 있는 규칙이다');
  });
});
