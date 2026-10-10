// 케이스 엑셀 통로 검사 — 첨부 이름 · 검색 조건 · 권한 빈칸 · 보류 기록 (카탈로그 §7 GET /api/catalog/export)
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import ExcelJS from 'exceljs';
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import { 등급표 } from '../auth/routeTable.js';
import authRoutes from '../auth/routes.js';
import { 라우트표 } from '../auth/scope.js';
import { 세션등록 } from '../auth/session.js';
import type { 보류 } from '../authoring/held.js';
import catalogRoutes from './routes.js';
import { listCases } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XCX';
const 열쇠 = 'xcx-검사용-세션-열쇠-32글자를-넘긴다-넉넉히';
const 건수 = 55;

type 칸 = 'none' | 'read' | 'write';

describe('등급과 경계', () => {
  it('(케이스, read) · 질의의 service 로 서비스를 찾는다', () => {
    expect(등급표['GET /api/catalog/export']).toEqual({ 기능: 'cases', 칸: 'read' });
    expect(라우트표['/api/catalog/export']).toEqual({ 종류: '질의' });
  });
});

describe.skipIf(연결 === undefined)('케이스 엑셀 통로', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const 출입증 = new Map<string, string>();
  const pool = async () => (await import('../db/index.js')).pool;

  async function 계정(username: string, 권한: { cases: 칸; runs: 칸; authoring: 칸 }): Promise<void> {
    const p = await pool();
    await p.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password)
            VALUES ($1, $1, $2, 'member', 'none', true, false)
       ON CONFLICT (username) DO UPDATE SET is_active = true, is_approved = true, must_change_password = false`,
      [username, await 해시('열려라참깨')],
    );
    await p.query('DELETE FROM user_service WHERE username = $1', [username]);
    await p.query(
      'INSERT INTO user_service (username, service_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, $3, $4, $5)',
      [username, 서비스, 권한.cases, 권한.runs, 권한.authoring],
    );
    const res = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: '열려라참깨' } });
    출입증.set(username, res.cookies[0]!.value);
  }

  async function 작성행(칸: { kind?: string; source?: number; status: string; held?: 보류[]; input?: object; discarded?: boolean }): Promise<number> {
    const r = await (await pool()).query<{ id: string }>(
      `INSERT INTO authoring_request
         (service_id, kind, source_id, requested_by, requested_by_name, status, claimed_by, started_at, finished_at,
          result, held_input, pr_url, discarded_at)
       VALUES ($1, $2, $3, 'xcx-all', '요청자', $4, 'xcx-맥', now(), now(), $5, $6, 'https://github.com/acme/xcx/pull/1',
               CASE WHEN $7 THEN now() END)
       RETURNING id`,
      [
        서비스,
        칸.kind ?? 'AUTHOR',
        칸.source ?? null,
        칸.status,
        칸.held === undefined ? null : JSON.stringify({ held: 칸.held }),
        칸.input === undefined ? null : JSON.stringify(칸.input),
        칸.discarded === true,
      ],
    );
    return Number(r.rows[0]!.id);
  }

  const 번호 = (n: number) => `${접두사}-${String(n).padStart(3, '0')}`;
  const 쿠폰: 보류 = {
    tcId: 번호(1),
    file: 'tests/xcx/a.spec.ts',
    kind: 'UNDECIDABLE',
    reason: '최종 금액 기준이 없다',
    fields: [{ side: 'expected', key: 'total', description: '최종 금액', type: 'number' }],
  };
  const 날짜: 보류 = { tcId: 'XCX-900', file: 'tests/xcx/b.spec.ts', kind: 'ON_HOLD', reason: '날짜 미정', fields: [] };
  let 뿌리1 = 0;
  let 뿌리2 = 0;
  let 뿌리4 = 0;

  beforeAll(async () => {
    const p = await pool();
    const r = await p.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, 'XCX 엑셀 검사용', '#3A5FCD', 'https://github.com/acme/xcx', 'xcx')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사],
    );
    서비스 = Number(r.rows[0]!.id);
    await 치우기();

    for (let n = 1; n <= 건수; n += 1) {
      await p.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, techniques)
         VALUES ($1, $2, '["desktop"]', '[]', 'xcx/a.spec.ts', '{}', '{}', $3)`,
        [번호(n), n === 2 ? '장바구니 담기' : `케이스 ${String(n)}`, n === 2 ? ['경계값 분석'] : []],
      );
    }

    const run = await p.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, status, env, service_id, service_name, tests_repo, base_url)
       VALUES ('XCX 실행', 'tester', 'FINISHED', 'qa', $1, 'XCX', 'https://xcx.example.com', 'https://qa.example.com')
       RETURNING run_id`,
      [서비스],
    );
    await p.query(
      `INSERT INTO run_item (run_id, tc_id, platform, tc_name, params, expected, status, duration_ms, finished_at,
                             file_path, param_schema, expected_schema, timeout_ms)
       VALUES ($1, $2, 'desktop', '케이스 1', '{}', '{}', 'PASS', 100, '2026-09-29T05:05:00Z', 'xcx/a.spec.ts', '{}', '{}', 300000)`,
      [run.rows[0]!.run_id, 번호(1)],
    );

    // 뿌리 1 — 끝난 실행 둘. 입력은 이어받을 때 옮겨 적혀 두 행에 다 있다. 뒤에 머지까지 끝났다
    const 입력 = { [번호(1)]: { expected: { total: 9000 }, by: 'xcx-all', at: '2026-09-29T01:00:00Z' } };
    뿌리1 = await 작성행({ status: 'DONE', held: [쿠폰, 날짜], input: 입력 });
    const 다시 = await 작성행({ kind: 'RERUN', source: 뿌리1, status: 'DONE', held: [쿠폰, 날짜], input: 입력 });
    await 작성행({ kind: 'MERGE', source: 다시, status: 'DONE' });
    // 뿌리 2 — 반영 전
    뿌리2 = await 작성행({ status: 'DONE', held: [{ ...날짜, tcId: 번호(3) }] });
    // 뿌리 3 — 폐기했고 반영 전이다. 뿌리 4 — 폐기했지만 이미 반영됐다
    await 작성행({ status: 'DONE', held: [{ ...날짜, tcId: 번호(4) }], discarded: true });
    뿌리4 = await 작성행({ status: 'DONE', held: [{ ...날짜, tcId: 번호(5) }], discarded: true });
    await 작성행({ kind: 'MERGE', source: 뿌리4, status: 'DONE', discarded: true });

    app = Fastify();
    세션등록(app, 열쇠);
    인증등록(app);
    await app.register(authRoutes, { prefix: '/api' });
    await app.register(catalogRoutes, { prefix: '/api' });
    await app.ready();

    await 계정('xcx-all', { cases: 'read', runs: 'read', authoring: 'read' });
    await 계정('xcx-norun', { cases: 'read', runs: 'none', authoring: 'read' });
    await 계정('xcx-noauth', { cases: 'read', runs: 'read', authoring: 'none' });
    await 계정('xcx-nocase', { cases: 'none', runs: 'read', authoring: 'read' });
  });

  async function 치우기(): Promise<void> {
    const p = await pool();
    await p.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await p.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await p.query(`DELETE FROM test_case WHERE tc_id LIKE 'XCX-%'`);
    await p.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await p.query(`DELETE FROM user_service WHERE username LIKE 'xcx-%'`);
    await p.query(`DELETE FROM app_user WHERE username LIKE 'xcx-%'`);
  }

  afterAll(async () => {
    await 치우기();
    await (await pool()).query('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  const 받기 = (누구: string, 쿼리 = '') =>
    app.inject({ method: 'GET', url: `/api/catalog/export?service=${접두사}${쿼리}`, cookies: { platform_session: 출입증.get(누구)! } });

  async function 책(body: Buffer): Promise<ExcelJS.Workbook> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(new Uint8Array(body).buffer);
    return wb;
  }
  const 행들 = (wb: ExcelJS.Workbook, 이름: string): string[][] => {
    const 시트 = wb.getWorksheet(이름)!;
    const 결과: string[][] = [];
    시트.eachRow((row, i) => {
      if (i > 1) 결과.push((row.values as unknown[]).slice(1).map((v) => (v == null ? '' : String(v))));
    });
    return 결과;
  };

  it('xlsx 로 첨부하고 한글 이름은 filename* 로 싣는다', async () => {
    const res = await 받기('xcx-all');
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const 머리 = String(res.headers['content-disposition']);
    expect(머리).toMatch(/^attachment; filename="XCX-testcases-\d{4}-\d{2}-\d{2}\.xlsx"; filename\*=UTF-8''/);
    expect(decodeURIComponent(머리.split("UTF-8''")[1]!)).toMatch(/^XCX-테스트케이스-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });

  it('쪽 없이 전부 싣고 검색 조건은 따른다', async () => {
    expect(행들(await 책((await 받기('xcx-all')).rawPayload), '테스트 케이스')).toHaveLength(건수);
    const 거른 = 행들(await 책((await 받기('xcx-all', '&q=' + encodeURIComponent('장바구니'))).rawPayload), '테스트 케이스');
    expect(거른.map((r) => r[0])).toEqual([번호(2)]);
  });

  it('설계 기법 조건이 파일에 걸리고 기법이 맨 끝 열에 실린다 · 빈 값은 거르지 않는다', async () => {
    const 거른 = 행들(await 책((await 받기('xcx-all', '&technique=' + encodeURIComponent('경계값 분석'))).rawPayload), '테스트 케이스');
    expect(거른.map((r) => [r[0], r[8]])).toEqual([[번호(2), '경계값 분석']]);
    expect(행들(await 책((await 받기('xcx-all', '&technique=')).rawPayload), '테스트 케이스')).toHaveLength(건수);
  });

  it('모르는 설계 기법은 목록 · 엑셀 둘 다 400 BAD_TECHNIQUE', async () => {
    const 목록 = await app.inject({
      method: 'GET',
      url: `/api/catalog/cases?service=${접두사}&technique=bogus`,
      cookies: { platform_session: 출입증.get('xcx-all')! },
    });
    const 엑셀 = await 받기('xcx-all', '&technique=bogus');
    expect([목록.statusCode, 목록.json().error, 엑셀.statusCode, 엑셀.json().error]).toEqual([400, 'BAD_TECHNIQUE', 400, 'BAD_TECHNIQUE']);
  });

  it('모르는 종류는 목록 · 엑셀 둘 다 400 BAD_AXIS · 빈 값은 거르지 않는다', async () => {
    const 목록 = await app.inject({
      method: 'GET',
      url: `/api/catalog/cases?service=${접두사}&axis=` + encodeURIComponent('성능'),
      cookies: { platform_session: 출입증.get('xcx-all')! },
    });
    const 엑셀 = await 받기('xcx-all', '&axis=bogus');
    expect([목록.statusCode, 목록.json().error, 엑셀.statusCode, 엑셀.json().error]).toEqual([400, 'BAD_AXIS', 400, 'BAD_AXIS']);
    expect(행들(await 책((await 받기('xcx-all', '&axis=')).rawPayload), '테스트 케이스')).toHaveLength(건수);
  });

  it('목록 응답은 그대로다 — 쪽 크기 50 · 같은 모양에 묶음 번호표가 더해졌다', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/catalog/cases?service=${접두사}`, cookies: { platform_session: 출입증.get('xcx-all')! } });
    const body = res.json<Record<string, unknown>>();
    expect(Object.keys(body).sort()).toEqual(['groups', 'items', 'page', 'pageSize', 'sort', 'total', 'totalIsExact', 'unconfirmed']);
    expect(body).toEqual(
      await listCases({ service: 접두사, q: '', activeOnly: true, page: 1, pageSize: 50 }),
    );
    expect(body.pageSize).toBe(50);
    expect((body.items as unknown[]).length).toBe(50);
    expect(body.total).toBe(건수);
  });

  it('남의 서비스 · 케이스 read 없음은 403', async () => {
    const 남 = await app.inject({ method: 'GET', url: '/api/catalog/export?service=XCXO', cookies: { platform_session: 출입증.get('xcx-all')! } });
    expect(남.statusCode).toBe(403);
    expect((await 받기('xcx-nocase')).statusCode).toBe(403);
  });

  it('권한이 다 있으면 마지막 결과 · 사람이 값 채움 · 보류 기록이 실린다', async () => {
    const wb = await 책((await 받기('xcx-all')).rawPayload);
    const 첫줄 = 행들(wb, '테스트 케이스')[0]!;
    expect(첫줄[7]).toBe('통과 · 2026-09-29 14:05');
    expect(첫줄[6]).toBe(`정식 · 사람이 값 채움 — 작성 요청 #${String(뿌리1)} · xcx-all`);
  });

  it('보류 기록은 뿌리마다 가장 최근에 끝난 실행 한 건 — 옮겨 적힌 입력이 겹치지 않고, 폐기한 뿌리는 반영됐을 때만 싣는다', async () => {
    const 기록 = 행들(await 책((await 받기('xcx-all')).rawPayload), '보류 처리 기록');
    expect(기록.map((r) => [r[0], r[1], r[4], r[8]])).toEqual([
      [`#${String(뿌리1)}`, 번호(1), '값 채움', '반영됨'],
      [`#${String(뿌리1)}`, 'XCX-900', '값 필요', '반영됨'],
      [`#${String(뿌리2)}`, 번호(3), '값 필요', '반영 전'],
      [`#${String(뿌리4)}`, 번호(5), '값 필요', '반영됨'],
    ]);
    expect(기록[0]![5]).toBe('최종 금액 = 9000');
    expect(기록[0]![7]).toBe('2026-09-29 10:00');
  });

  it('작성 read 가 없으면 시트 하나 · 「사람이 값 채움」 없음', async () => {
    const wb = await 책((await 받기('xcx-noauth')).rawPayload);
    expect(wb.worksheets.map((s) => s.name)).toEqual(['테스트 케이스']);
    expect(행들(wb, '테스트 케이스')[0]![6]).toBe('정식');
  });

  it('실행 read 가 없으면 마지막 결과 칸이 빈다', async () => {
    const 첫줄 = 행들(await 책((await 받기('xcx-norun')).rawPayload), '테스트 케이스')[0]!;
    expect(첫줄[7] ?? '').toBe('');
  });
});
