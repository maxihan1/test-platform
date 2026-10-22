// 계정 보류 — GET /api/prd 의 held · 이어 작성 판정 · 역할 계정 비밀번호 가리기 (도메인/작성 §7 「표준 기획서 통로」 · §3.6 「★ 역할별 계정」)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { type 판, 판차리기 } from '../authoring/continue-fixture.js';
import { 보류읽기 } from './held.js';
import prdRoutes from './routes.js';
import { 테스트비밀번호들 } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 다덮은셈 = { total: 3, cased: 3, held: 0, excluded: {}, missing: [], later: [] };
const 관리자비밀번호 = 'adm-pw-5512';
const 일반비밀번호 = 'pw-7731';

describe.skipIf(연결 === undefined)('PRD 보류 칸', () => {
  let 판: 판;
  let app: FastifyInstance;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 보류넣기 = async (줄: [string, string][]) => {
    for (const [req, role] of 줄) await q('INSERT INTO req_hold (service_id, req_id, role) VALUES ($1, $2, $3)', [판.서비스, req, role]);
  };
  const 계정넣기 = (계정: object[], 운영 = false) =>
    q('UPDATE service_env SET role_accounts = $2, is_prod = $3 WHERE service_id = $1', [판.서비스, JSON.stringify(계정), 운영]);
  const 치우기 = async () => {
    await q('DELETE FROM req_hold WHERE service_id = $1', [판.서비스]);
    await q('DELETE FROM req_case WHERE service_id = $1', [판.서비스]);
    await q("DELETE FROM test_case WHERE tc_id = 'XHC-FN-001'");
    await q('DELETE FROM authoring_asset WHERE request_id IN (SELECT id FROM authoring_request WHERE service_id = $1)', [판.서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [판.서비스]);
  };

  beforeAll(async () => {
    판 = await 판차리기('XHC');
    await q(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name)
       VALUES ($1, 1, $2, 3, 'PERSON', 'xhc', '검사')`,
      [판.서비스, JSON.stringify(['XHC-REQ-001', 'XHC-REQ-002', 'XHC-REQ-003'].map((reqId) => ({ reqId, feature: 'f', text: reqId, basis: [], status: 'CONFIRMED' })))],
    );
    app = Fastify();
    await app.register(prdRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    await 치우기();
    await 계정넣기([{ role: '관리자', loginId: 'admin', loginPassword: 관리자비밀번호 }, { role: '판매자', loginId: 'seller', loginPassword: '' }]);
  });

  afterAll(async () => {
    await app.close();
    await 치우기();
    await q('DELETE FROM prd_version WHERE service_id = $1', [판.서비스]);
    await 판.닫기();
  });

  it('지금 판에 있는 보류 번호만 싣고 역할마다 건수와 계정을 넣었는지 알린다 — 판에 없는 번호는 안 든다', async () => {
    await 보류넣기([['XHC-REQ-001', '관리자'], ['XHC-REQ-002', '관리자'], ['XHC-REQ-002', '판매자'], ['XHC-REQ-003', '일반 회원'], ['XHC-REQ-009', '관리자']]);
    expect(await 보류읽기(판.서비스)).toEqual({
      reqs: { 'XHC-REQ-001': ['관리자'], 'XHC-REQ-002': ['관리자', '판매자'], 'XHC-REQ-003': ['일반 회원'] },
      roles: [
        { role: '관리자', count: 2, registered: true },
        { role: '일반 회원', count: 1, registered: true },
        { role: '판매자', count: 1, registered: false },
      ],
      continueFrom: null,
    });
  });

  it('운영 서버 줄의 계정은 등록으로 안 센다', async () => {
    await 보류넣기([['XHC-REQ-001', '관리자'], ['XHC-REQ-003', '일반 회원']]);
    await 계정넣기([{ role: '관리자', loginId: 'admin', loginPassword: 관리자비밀번호 }], true);
    expect((await 보류읽기(판.서비스)).roles).toEqual([
      { role: '관리자', count: 1, registered: false },
      { role: '일반 회원', count: 1, registered: false },
    ]);
  });

  it('테스트가 생긴 번호는 빠진다 — 비활성 케이스는 테스트로 안 센다', async () => {
    await 보류넣기([['XHC-REQ-001', '관리자'], ['XHC-REQ-002', '관리자']]);
    await q(
      `INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema, is_active)
       VALUES ('XHC-FN-001', '검사', 'tests/xhc/a.spec.ts', '{}', '{}', true)`,
    );
    await q("INSERT INTO req_case (service_id, req_id, tc_id, axis) VALUES ($1, 'XHC-REQ-001', 'XHC-FN-001', '정상')", [판.서비스]);
    expect((await 보류읽기(판.서비스)).reqs).toEqual({ 'XHC-REQ-002': ['관리자'] });
    await q("UPDATE test_case SET is_active = false WHERE tc_id = 'XHC-FN-001'");
    expect(Object.keys((await 보류읽기(판.서비스)).reqs)).toEqual(['XHC-REQ-001', 'XHC-REQ-002']);
  });

  it('continueFrom 은 이어 작성이 막지 않는 가장 최근 대조 뿌리다 — 계정을 넣은 역할의 번호가 없으면 null', async () => {
    const 옛 = await 판.원본({ coverage: 다덮은셈, compare: true });
    const 새 = await 판.원본({ coverage: 다덮은셈, compare: true });
    await 판.원본({ coverage: 다덮은셈, compare: true, params: { prdApply: true } });
    await 보류넣기([['XHC-REQ-002', '판매자']]);
    expect((await 보류읽기(판.서비스)).continueFrom).toBe(null);
    await 보류넣기([['XHC-REQ-001', '관리자']]);
    expect((await 보류읽기(판.서비스)).continueFrom).toBe(새.뿌리);
    expect(새.뿌리).toBeGreaterThan(옛.뿌리);
  });

  it('남은 것이 없는 셈이어도 계정을 넣은 보류가 있으면 이어 작성할 수 있다 — 없으면 NOTHING_LEFT', async () => {
    const { 뿌리 } = await 판.원본({ coverage: 다덮은셈, compare: true });
    expect((await 판.상세(뿌리)).canContinue).toBe(false);
    await 보류넣기([['XHC-REQ-002', '판매자']]);
    expect((await 판.상세(뿌리)).canContinue).toBe(false);
    await 보류넣기([['XHC-REQ-001', '관리자']]);
    expect((await 판.상세(뿌리)).canContinue).toBe(true);
  });

  it('계정을 넣은 줄이 뿌리의 대상 서버 줄이 아니면 이어 작성이 안 열린다 — 에이전트는 뿌리 줄 계정만 받는다', async () => {
    await 계정넣기([]);
    await q(
      `INSERT INTO service_env (service_id, env, base_url, login_id, login_password, role_accounts)
       VALUES ($1, 'dev', 'https://dev.xhc.test', 'u', 'pw-dev-4410', $2)`,
      [판.서비스, JSON.stringify([{ role: '관리자', loginId: 'admin', loginPassword: 관리자비밀번호 }])],
    );
    try {
      const { 뿌리 } = await 판.원본({ coverage: 다덮은셈, compare: true });
      await 보류넣기([['XHC-REQ-001', '관리자']]);
      const 응답 = await 보류읽기(판.서비스);
      expect(응답.roles).toEqual([{ role: '관리자', count: 1, registered: true }]);
      expect(응답.continueFrom).toBe(null);
      expect((await 판.상세(뿌리)).canContinue).toBe(false);
    } finally {
      await q(`DELETE FROM service_env WHERE service_id = $1 AND env = 'dev'`, [판.서비스]);
    }
  });

  it('Android 앱은 대조가 아닌 뿌리도 앱 줄 계정으로 이어 작성이 열린다 — 웹 정방향 뿌리는 그대로 안 열린다', async () => {
    const { 뿌리 } = await 판.원본({ coverage: 다덮은셈 });
    await 보류넣기([['XHC-REQ-001', '관리자']]);
    expect((await 판.상세(뿌리)).canContinue).toBe(false);
    expect((await 보류읽기(판.서비스)).continueFrom).toBe(null);
    await q(`UPDATE service SET kind = 'APP' WHERE id = $1`, [판.서비스]);
    await q(`UPDATE service_env SET app_path = '/apk/xhc.apk' WHERE service_id = $1`, [판.서비스]);
    try {
      expect((await 판.상세(뿌리)).canContinue).toBe(true);
      expect((await 보류읽기(판.서비스)).continueFrom).toBe(뿌리);
    } finally {
      await q(`UPDATE service_env SET app_path = NULL WHERE service_id = $1`, [판.서비스]);
      await q(`UPDATE service SET kind = 'SCREEN' WHERE id = $1`, [판.서비스]);
    }
  });

  it('응답에 비밀번호 원문이 없다', async () => {
    await 보류넣기([['XHC-REQ-001', '관리자'], ['XHC-REQ-003', '일반 회원']]);
    const r = await app.inject({ method: 'GET', url: '/api/prd?service=XHC' });
    expect(r.statusCode).toBe(200);
    expect(r.json().held.roles).toHaveLength(2);
    expect(r.body).not.toContain(관리자비밀번호);
    expect(r.body).not.toContain(일반비밀번호);
  });

  it('워드 · 엑셀에서 가릴 비밀번호에 역할 계정 비밀번호도 든다', async () => {
    const 목록 = await 테스트비밀번호들(판.서비스);
    expect(목록).toContain(관리자비밀번호);
    expect(목록).toContain(일반비밀번호);
    expect(목록).not.toContain('');
  });
});
