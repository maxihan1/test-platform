// PRD 에 없는 화면 셈(결정 목록 ③ 미검증 화면 재료)과 그 화면을 작성 중인 요청 (도메인/작성 §3.6 「★ 결정 목록」 · 「기획서에 없는 화면 — 두 번째 작성」)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { 열린화면요청 } from '../authoring/uncovered.js';
import { 찾은화면셈 } from './found.js';
import prdRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XPD';
const 케이스들 = ['XPD-FN-001', 'XPD-FN-002', 'XPD-FN-003'];
const 근거 = [{ from: '기획서.docx', ref: 'REQ-1', quote: '게시판에서 글을 본다' }];

describe.skipIf(연결 === undefined)('PRD 에 없는 화면 셈', () => {
  let app: FastifyInstance;
  let 서비스 = 0;

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 읽기 = () => 찾은화면셈(서비스);
  const 찾음 = (rows: [string, string, string][], env = 'qa') =>
    q(
      `INSERT INTO screen_found (service_id, env, state, url, name)
       SELECT $1, $5, s.state, s.url, s.name FROM unnest($2::text[], $3::text[], $4::text[]) AS s(state, url, name)`,
      [서비스, rows.map((x) => x[0]), rows.map((x) => x[1]), rows.map((x) => x[2]), env],
    );
  const 요청 = async (칸: { params?: object; compare?: boolean; discarded?: boolean; 자료?: boolean; 머지?: 'DONE' | 'FAILED'; status?: string }) => {
    const r = await q<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, compare, env, discarded_at)
       VALUES ($1, 'AUTHOR', $2, 'xpd', '검사', $5, $3, CASE WHEN $3 THEN 'qa' END, $4) RETURNING id`,
      [서비스, JSON.stringify(칸.params ?? {}), 칸.compare ?? true, 칸.discarded === true ? new Date() : null, 칸.status ?? 'DONE'],
    );
    const id = Number(r.rows[0]!.id);
    if (칸.자료 === true) {
      await q("INSERT INTO authoring_asset (request_id, position, kind, name, size) VALUES ($1, 1, 'FILE', '기획서.docx', 5)", [id]);
    }
    if (칸.머지 !== undefined) {
      await q(
        "INSERT INTO authoring_request (service_id, kind, source_id, requested_by, requested_by_name, status) VALUES ($1, 'MERGE', $2, 'xpd', '검사', $3)",
        [서비스, id, 칸.머지],
      );
    }
    return id;
  };

  const 치우기 = async () => {
    await q('DELETE FROM screen_found WHERE service_id = $1', [서비스]);
    await q('DELETE FROM authoring_asset WHERE request_id IN (SELECT id FROM authoring_request WHERE service_id = $1)', [서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await q('UPDATE authoring_request SET prd_version = NULL WHERE service_id = $1', [서비스]);
    await q('DELETE FROM prd_version WHERE service_id = $1', [서비스]);
    await q('DELETE FROM req_case WHERE service_id = $1', [서비스]);
    await q('DELETE FROM case_screen WHERE tc_id = ANY($1)', [케이스들]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스들]);
  };

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', 'xpd')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} PRD 에 없는 화면 검사용`],
    );
    서비스 = Number(s.rows[0]!.id);
    app = Fastify();
    await app.register(prdRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(치우기);

  afterAll(async () => {
    await app.close();
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
  });

  it('케이스가 없으면 찾은 화면 전부가 미검증 화면이다', async () => {
    expect(await 읽기()).toEqual({ uncoveredScreens: [] });
    await 찾음([['로그인:일반 회원', '/cart', '장바구니'], ['로그아웃', '/', '홈']]);
    expect(await 읽기()).toEqual({
      uncoveredScreens: [{ state: '로그아웃', url: '/', name: '홈' }, { state: '로그인:일반 회원', url: '/cart', name: '장바구니' }],
    });
  });

  it('그 애플리케이션의 활성 케이스가 가져오는 화면 주소 · 여는 주소를 같은 틀로 바꿔 덮고, 상태는 안 가른다 — 요구 번호가 없는 케이스도 · `:id` · 인자 꼬리도 (PRD-F9-04 · WEB-F6-03)', async () => {
    const 저장 = await app.inject({
      method: 'PUT',
      url: `/api/prd?service=${접두사}`,
      payload: { baseVersion: 0, items: [{ feature: '게시판', text: '글을 본다', basis: 근거, status: 'CONFIRMED' }] },
    });
    expect(저장.statusCode).toBe(200);
    for (const tc of 케이스들) {
      await q(
        `INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema, is_active)
         VALUES ($1, '검사', 'tests/xpd/a.spec.ts', '{}', '{}', $2)`,
        [tc, tc !== 'XPD-FN-002'],
      );
    }
    await q(
      `INSERT INTO req_case (service_id, req_id, tc_id, axis)
       VALUES ($1, 'XPD-REQ-001', 'XPD-FN-001', '정상'), ($1, 'XPD-REQ-001', 'XPD-FN-002', '정상')`,
      [서비스],
    );
    await q(
      `INSERT INTO case_screen (tc_id, file, screen_url, open_urls)
       VALUES ('XPD-FN-001', 'tests/xpd/pages/board.page.ts', '/board/:id', '{/board/:id/edit}'), ('XPD-FN-001', 'tests/xpd/components/nav.component.ts', NULL, '{}'),
              ('XPD-FN-001', 'tests/xpd/pages/board-list.page.ts', '/board', '{}'),
              ('XPD-FN-002', 'tests/xpd/pages/hidden.page.ts', '/hidden', '{}'), ('XPD-FN-003', 'tests/xpd/pages/other.page.ts', '/other', '{}')`,
    );
    await 찾음([
      ['로그아웃', '/board/:n', '게시판'],
      ['로그인:일반 회원', '/board/:n', '게시판'],
      ['로그인:일반 회원', '/board/:n/edit', '게시글 수정'],
      ['로그인:일반 회원', '/board?category=자유', '자유게시판'],
      ['로그인:일반 회원', '/hidden', '숨은 화면'],
      ['로그인:일반 회원', '/other', '요구 없는 케이스 화면'],
      ['로그인:일반 회원', '/cart', '장바구니'],
    ]);
    expect((await 읽기()).uncoveredScreens).toEqual([
      { state: '로그인:일반 회원', url: '/cart', name: '장바구니' },
      { state: '로그인:일반 회원', url: '/hidden', name: '숨은 화면' },
    ]);
  });

  it('대상 서버가 달라도 같은 상태 · 틀은 한 줄이다 — 이름은 빈 것보다 있는 것 (PRD-F9-29)', async () => {
    await 찾음([['로그인:일반 회원', '/cart', '']], 'qa');
    await 찾음([['로그인:일반 회원', '/cart', '장바구니'], ['로그인:관리자', '/cart', '장바구니']], 'prod');
    expect(await 읽기()).toEqual({
      uncoveredScreens: [{ state: '로그인:관리자', url: '/cart', name: '장바구니' }, { state: '로그인:일반 회원', url: '/cart', name: '장바구니' }],
    });
  });

  it('열린 화면만 요청은 폐기 안 됨 · 대조 · 자료 없음 · 반영 아님 · 초안 · 실패 · 병합된 반영이 아닌 뿌리만 센다', async () => {
    const 열림 = await 요청({});
    await 요청({ status: 'DRAFT' });
    await 요청({ status: 'FAILED' });
    const 실패머지 = await 요청({ 머지: 'FAILED' });
    await 요청({ 자료: true });
    await 요청({ discarded: true });
    await 요청({ params: { prdApply: true } });
    await 요청({ compare: false });
    await 요청({ 머지: 'DONE' });
    expect(await 열린화면요청(서비스)).toEqual([열림, 실패머지]);
  });
});
