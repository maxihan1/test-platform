// 케이스 목록 응답이 맥락을 싣고 · 묶음 차례로 쪽을 자르고 · 맥락으로 거르는지 DB 로 본다 (도메인/카탈로그 §7 · §8.1 「맥락」)

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { CaseSpec } from '@platform/kit';

import { listCases, save, type CaseQuery } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 번호들 = ['XCL-FN-001', 'XCL-FN-002', 'XCL-FN-003', 'XCL-FN-004'];
const 화면 = 'tests/xcl/pages/signup.page.ts';

function spec(tcId: string, name: string): CaseSpec {
  return {
    tcId,
    name,
    platforms: ['desktop'],
    precondition: [],
    paramSchema: { type: 'object', properties: {} },
    expectedSchema: { type: 'object', properties: {} },
    filePath: `xcl/${tcId}.spec.ts`,
  };
}

describe.skipIf(연결 === undefined)('케이스 목록 맥락', () => {
  let 서비스 = 0;
  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query(sql, 값);
  };
  const 치우기 = async () => {
    await q('DELETE FROM case_screen WHERE tc_id = ANY($1)', [번호들]);
    if (서비스 !== 0) {
      await q('DELETE FROM req_case WHERE service_id = $1', [서비스]);
      await q('DELETE FROM prd_version WHERE service_id = $1', [서비스]);
    }
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    if (서비스 !== 0) await q('DELETE FROM service WHERE id = $1', [서비스]);
  };

  beforeAll(async () => {
    const s = await q(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
       VALUES ('XCL', 'XCL 목록 맥락 검사용', '#888888', '', 'xcl') RETURNING id`,
    );
    서비스 = Number(s.rows[0]!.id);
    await save(
      [spec('XCL-FN-001', '로그인 잠금'), spec('XCL-FN-002', '이메일 겹침'), spec('XCL-FN-003', '비밀번호 길이'), spec('XCL-FN-004', '주문 내역')],
      false,
      'XCL',
    );
    const 판 = [
      { reqId: 'XCL-REQ-001', feature: '회원가입', text: '이메일은 한 번만 쓴다', basis: [], status: 'CONFIRMED' },
      { reqId: 'XCL-REQ-002', feature: '로그인', text: '다섯 번 틀리면 잠근다', basis: [], status: 'CONFIRMED' },
      { reqId: 'XCL-REQ-003', feature: '회원가입', text: '비밀번호는 8자 이상', basis: [], status: 'CONFIRMED' },
    ];
    await q(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name)
       VALUES ($1, 1, $2, 3, 'PERSON', 'xcl', '검사')`,
      [서비스, JSON.stringify(판)],
    );
    for (const [req, tc, axis] of [['XCL-REQ-002', 'XCL-FN-001', '정상'], ['XCL-REQ-001', 'XCL-FN-002', '예외'], ['XCL-REQ-003', 'XCL-FN-003', '경계']]) {
      await q('INSERT INTO req_case (service_id, req_id, tc_id, axis) VALUES ($1, $2, $3, $4)', [서비스, req, tc, axis]);
    }
    await q('INSERT INTO case_screen (tc_id, file, screen_url) VALUES ($1, $2, $3)', ['XCL-FN-003', 화면, '/signup']);
  });

  afterAll(치우기);

  const 목록 = (더: Partial<CaseQuery> = {}) => listCases({ service: 'XCL', q: '', activeOnly: true, page: 1, pageSize: 50, ...더 });
  const 번호 = async (더: Partial<CaseQuery> = {}) => (await 목록(더)).items.map((c) => c.tcId);

  it('줄마다 기능 묶음 · 요구(문장 · 종류) · 화면을 싣고 기능 묶음 차례로 선다', async () => {
    const 받은 = await 목록();
    expect(받은.sort).toBe('feature');
    expect(받은.items.map((c) => [c.tcId, c.feature])).toEqual([
      ['XCL-FN-002', '회원가입'], ['XCL-FN-003', '회원가입'], ['XCL-FN-001', '로그인'], ['XCL-FN-004', null],
    ]);
    expect(받은.items[1]).toMatchObject({
      reqs: [{ reqId: 'XCL-REQ-003', text: '비밀번호는 8자 이상', axis: '경계' }],
      screens: [{ file: 화면, url: '/signup' }],
    });
    expect(받은.items[3]).toMatchObject({ reqs: [], screens: [] });
  });

  it('PRD 를 쓰는 서비스인지는 검색 조건을 안 따른다 — 묶음 없는 케이스만 걸러도 참이다', async () => {
    expect((await 목록({ feature: '' })).hasFeatures).toBe(true);
    expect((await listCases({ service: 'XCLNONE', q: '', activeOnly: true, page: 1, pageSize: 50 })).hasFeatures).toBe(false);
  });

  it('쪽은 묶음 차례로 자르고 · 묶음 번호표는 쪽이 아니라 맞은 전부다', async () => {
    const 둘째쪽 = await 목록({ page: 2, pageSize: 2 });
    expect(둘째쪽.items.map((c) => c.tcId)).toEqual(['XCL-FN-001', 'XCL-FN-004']);
    expect(둘째쪽.total).toBe(4);
    expect(둘째쪽.groups.map((g) => [g.feature, g.screen, g.tcIds])).toEqual([
      ['회원가입', null, ['XCL-FN-002']],
      ['회원가입', 화면, ['XCL-FN-003']],
      ['로그인', null, ['XCL-FN-001']],
      [null, null, ['XCL-FN-004']],
    ]);
  });

  it('찾기는 이름 · 번호에 더해 요구 번호 · 요구 문장에도 맞는다', async () => {
    expect(await 번호({ q: '잠근다' })).toEqual(['XCL-FN-001']);
    expect(await 번호({ q: 'xcl-req-001' })).toEqual(['XCL-FN-002']);
    expect(await 번호({ q: '주문' })).toEqual(['XCL-FN-004']);
  });

  it('기능 묶음 · 화면 · 종류 · 요구 번호로 거르고 · 묶음 없음은 빈 글자다', async () => {
    expect(await 번호({ feature: '회원가입' })).toEqual(['XCL-FN-002', 'XCL-FN-003']);
    expect(await 번호({ feature: '회원가입', screen: 화면 })).toEqual(['XCL-FN-003']);
    expect(await 번호({ feature: '' })).toEqual(['XCL-FN-004']);
    expect(await 번호({ axis: '예외' })).toEqual(['XCL-FN-002']);
    expect(await 번호({ req: 'XCL-REQ-002' })).toEqual(['XCL-FN-001']);
    expect((await 목록({ feature: '로그인' })).total).toBe(1);
  });
});
