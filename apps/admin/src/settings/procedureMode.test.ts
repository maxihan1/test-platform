// 설정 API 의 「프로시저 작성」 스위치 — 목록 칸 · 웹에서 켜기 거절 · 사용 중이면 끄기 거절 · 꺼짐에서 켜짐일 때만 다시 스캔
// (도메인/실행 「프로시저 작성 스위치」 · TP-F2-10). DATABASE_URL 이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 검사프로젝트, 검사프로젝트치우기 } from './projectFixture.js';
import settingsRoutes from './routes.js';

const 훑기 = vi.hoisted(() => vi.fn(async (_서비스: number, _로그: unknown): Promise<unknown> => undefined));
vi.mock('../catalog/scanRun.js', () => ({ 병합뒤훑기: 훑기 }));

const 연결 = process.env.DATABASE_URL;
const 앱접두사 = 'XPM';
const 웹접두사 = 'XPMW';
const 케이스들 = ['XPM-FN-001', 'XPM-FN-002'];

type 서비스응답 = { id: number; prefix: string; procedureMode: boolean };

describe.skipIf(연결 === undefined)('설정 API 의 프로시저 작성 스위치', { timeout: 30_000 }, () => {
  let app: FastifyInstance;
  let 앱번호 = 0;
  let 웹번호 = 0;

  const pool = async () => (await import('../db/index.js')).pool;

  async function 치운다(): Promise<void> {
    const p = await pool();
    await p.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스들]);
    await p.query('DELETE FROM service_env WHERE service_id IN (SELECT id FROM service WHERE prefix = ANY($1))', [[앱접두사, 웹접두사]]);
    await p.query('DELETE FROM service WHERE prefix = ANY($1)', [[앱접두사, 웹접두사]]);
    await 검사프로젝트치우기();
  }

  const 만든다 = async (prefix: string, kind: string): Promise<number> => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/settings/services',
      payload: { prefix, kind, name: `${prefix} 검사`, color: '#112233', projectId: await 검사프로젝트(), testsRepo: '', testsDir: 'xpm' },
    });
    expect(res.statusCode).toBe(201);
    return res.json<{ id: number }>().id;
  };
  const 고친다 = (id: number, 본문: Record<string, unknown>) =>
    app.inject({ method: 'PATCH', url: `/api/settings/services/${String(id)}`, payload: 본문 });
  const 읽는다 = async (prefix: string): Promise<서비스응답 | undefined> => {
    const res = await app.inject({ method: 'GET', url: '/api/settings/services' });
    return res.json<{ items: 서비스응답[] }>().items.find((s) => s.prefix === prefix);
  };
  const 저장값 = async (id: number): Promise<boolean> =>
    (await (await pool()).query<{ procedure_mode: boolean }>('SELECT procedure_mode FROM service WHERE id = $1', [id])).rows[0]!.procedure_mode;
  const 케이스넣기 = async (tcId: string, 프로시저: boolean, 활성: boolean): Promise<void> => {
    await (await pool()).query(
      `INSERT INTO test_case (tc_id, name, file_path, param_schema, expected_schema, is_active, proc_id, proc_seq, proc_name)
       VALUES ($1, $1 || ' 이름', 'xpm.spec.ts', '{}', '{}', $2, $3, $4, $5)`,
      [tcId, 활성, 프로시저 ? 'xpm-proc' : null, 프로시저 ? 1 : null, 프로시저 ? '검사 프로시저' : null],
    );
  };
  const 스캔이끝나길기다린다 = () => new Promise((끝) => setTimeout(끝, 50));

  beforeAll(async () => {
    app = Fastify();
    await app.register(settingsRoutes, { prefix: '/api' });
    await app.ready();
    await 치운다();
    앱번호 = await 만든다(앱접두사, 'APP');
    웹번호 = await 만든다(웹접두사, 'SCREEN');
  }, 60_000);

  afterAll(async () => {
    await 치운다();
    await app.close();
    await (await pool()).end();
  }, 60_000);

  beforeEach(async () => {
    const p = await pool();
    await p.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [케이스들]);
    await p.query('UPDATE service SET procedure_mode = false WHERE id = $1', [앱번호]);
    훑기.mockClear();
  });

  it('목록은 애플리케이션마다 procedureMode 를 싣고 처음에는 꺼짐이다', async () => {
    expect(await 읽는다(앱접두사)).toMatchObject({ procedureMode: false });
    expect(await 읽는다(웹접두사)).toMatchObject({ procedureMode: false });
  });

  it('웹 애플리케이션에서 켜면 400 NOT_PROCEDURE_SERVICE 이고 값은 그대로다', async () => {
    const res = await 고친다(웹번호, { procedureMode: true });
    expect([res.statusCode, res.json()]).toEqual([400, { error: 'NOT_PROCEDURE_SERVICE' }]);
    expect(await 저장값(웹번호)).toBe(false);
    await 스캔이끝나길기다린다();
    expect(훑기).not.toHaveBeenCalled();
  });

  it('웹 애플리케이션에 false 를 보내는 저장은 받는다', async () => {
    expect((await 고친다(웹번호, { procedureMode: false })).statusCode).toBe(200);
  });

  it('Android 앱에서 켜면 200 이고 값이 true 가 되며 그 애플리케이션만 바로 다시 스캔한다', async () => {
    const res = await 고친다(앱번호, { procedureMode: true });
    expect(res.statusCode).toBe(200);
    expect(await 저장값(앱번호)).toBe(true);
    expect(await 읽는다(앱접두사)).toMatchObject({ procedureMode: true });
    await vi.waitFor(() => expect(훑기).toHaveBeenCalledTimes(1));
    expect(훑기.mock.calls[0]?.[0]).toBe(앱번호);
  });

  it('이미 켜진 것을 다시 true 로 저장하거나 끄거나 안 보내면 스캔하지 않는다', async () => {
    expect((await 고친다(앱번호, { procedureMode: true })).statusCode).toBe(200);
    await vi.waitFor(() => expect(훑기).toHaveBeenCalledTimes(1));
    훑기.mockClear();
    expect((await 고친다(앱번호, { procedureMode: true })).statusCode).toBe(200);
    expect((await 고친다(앱번호, { name: 'XPM 이름만' })).statusCode).toBe(200);
    expect(await 저장값(앱번호)).toBe(true);
    expect((await 고친다(앱번호, { procedureMode: false })).statusCode).toBe(200);
    expect(await 저장값(앱번호)).toBe(false);
    await 스캔이끝나길기다린다();
    expect(훑기).not.toHaveBeenCalled();
  });

  it('활성 프로시저 케이스가 있으면 끄기가 409 PROCEDURE_IN_USE 이고 값은 true 그대로다', async () => {
    expect((await 고친다(앱번호, { procedureMode: true })).statusCode).toBe(200);
    await 케이스넣기('XPM-FN-001', true, true);
    const res = await 고친다(앱번호, { procedureMode: false });
    expect([res.statusCode, res.json()]).toEqual([409, { error: 'PROCEDURE_IN_USE' }]);
    expect(await 저장값(앱번호)).toBe(true);
  });

  it('비활성이거나 옛 꼴 케이스뿐이면 끌 수 있다', async () => {
    expect((await 고친다(앱번호, { procedureMode: true })).statusCode).toBe(200);
    await 케이스넣기('XPM-FN-001', true, false);
    await 케이스넣기('XPM-FN-002', false, true);
    expect((await 고친다(앱번호, { procedureMode: false })).statusCode).toBe(200);
    expect(await 저장값(앱번호)).toBe(false);
  });
});
