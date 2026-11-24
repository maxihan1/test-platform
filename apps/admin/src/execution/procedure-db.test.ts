// 실행 만들기가 고른 케이스를 프로시저로 펼치고 실행 단위(run_exec) 줄을 케이스 줄과 같이 만드는지 본다 (도메인/실행 §3.2 「테스트 프로시저 실행」 · DATABASE_URL 이 있을 때만)

import Fastify from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 스모크안통과 } from './buildRun.js';
import executionRoutes from './routes.js';
import { 정기실행을만든다 } from './scheduled.js';
import { createRun, RunInputError, type CreateRunInput } from './store.js';

// 빌드 실행이 분배까지 걸지 않게 한다 — 러너 · 팜에 닿지 않는다 (builds-db.test.ts 와 같은 까닭)
vi.mock('./dispatcher.js', () => ({ dispatch: vi.fn(async () => undefined), markAborted: vi.fn() }));

// 라우트 등록이 띄우는 재기동 복구가 이 파일이 만든 RUNNING 실행을 닫지 않게 한다 (routes.test.ts 와 같은 까닭)
vi.mock('./store.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./store.js')>()),
  recoverRunning: vi.fn(async () => 0),
}));

const 연결 = process.env.DATABASE_URL;
const 프로시저 = 'XPC-TP-001';
const 케이스들 = ['XPC-FN-101', 'XPC-FN-102', 'XPC-UI-103', 'XPC-FN-104', 'XPC-FN-201', 'XPC-FN-301', 'XPCW-FN-001', 'XPCW-UI-001'];
const 서비스들 = "(SELECT id FROM service WHERE prefix IN ('XPC', 'XPCW'))";

const 돈다 = async (): Promise<boolean> => false;
const 못돈다 = async (): Promise<boolean> => true;

describe.skipIf(연결 === undefined)('실행 만들기 — 테스트 프로시저', () => {
  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };

  async function 실행을치운다(): Promise<void> {
    await q(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id IN ${서비스들})`);
    await q(`DELETE FROM run_exec WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id IN ${서비스들})`);
    await q(`DELETE FROM test_run WHERE service_id IN ${서비스들}`);
  }

  async function 치운다(): Promise<void> {
    await 실행을치운다();
    await q('DELETE FROM case_input WHERE tc_id = ANY($1::text[])', [케이스들]);
    await q('DELETE FROM test_case WHERE tc_id = ANY($1::text[])', [케이스들]);
    await q(`DELETE FROM service_env WHERE service_id IN ${서비스들}`);
    await q("DELETE FROM service WHERE prefix IN ('XPC', 'XPCW')");
  }

  const 케이스 = (tcId: string, 이름: string, platforms: string[], file: string, 차례: number | null, 활성 = true) =>
    q(
      `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema, is_active, proc_id, proc_seq, proc_name)
       VALUES ($1, $2, $3, '[]', $4, $5, '{"type":"object","properties":{}}', $6, $7, $8, $9)`,
      [
        tcId,
        이름,
        JSON.stringify(platforms),
        file,
        JSON.stringify({ type: 'object', properties: { 본문: { type: 'string', default: '기본 본문' } } }),
        활성,
        차례 === null ? null : 프로시저,
        차례,
        차례 === null ? null : '글쓰기 — 입력 제한부터 게시까지',
      ],
    );

  const 요청 = (items: CreateRunInput['items'], 더?: Partial<CreateRunInput>): CreateRunInput => ({ origin: 'MANUAL', triggeredBy: 'xpc', env: 'qa', items, ...더 });
  const 앱항목 = (tcId: string, 더?: object) => ({ tcId, platforms: ['android' as const], params: {}, expected: {}, ...더 });

  const 단위줄 = async (runId: number) =>
    (await q<{ exec_id: string; file_path: string; proc_id: string | null; proc_name: string | null; platform: string; attempt: number; timeout_ms: number }>(
      'SELECT exec_id, file_path, proc_id, proc_name, platform, attempt, timeout_ms FROM run_exec WHERE run_id = $1 ORDER BY exec_id',
      [runId],
    )).rows;
  const 케이스줄 = async (runId: number) =>
    (await q<{ history_id: string; exec_id: string; exec_seq: number; tc_id: string; attempt: number; timeout_ms: number; params: Record<string, unknown> }>(
      'SELECT history_id, exec_id, exec_seq, tc_id, attempt, timeout_ms, params FROM run_item WHERE run_id = $1 ORDER BY history_id',
      [runId],
    )).rows;

  beforeAll(async () => {
    await 치운다();
    await q(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind, procedure_mode)
       VALUES ('XPC', 'XPC 앱', '#445566', '', 'xpc', 'APP', true), ('XPCW', 'XPCW 웹', '#445566', '', 'xpcw', 'SCREEN', false)`,
    );
    await q(`INSERT INTO service_env (service_id, env, base_url) SELECT id, 'qa', 'https://qa.example.com' FROM service WHERE prefix IN ('XPC', 'XPCW')`);
    // 넣는 차례를 프로시저 안 차례와 다르게 둔다 — 펼친 차례가 proc_seq 인지 본다
    await 케이스('XPC-FN-104', '게시하고 타임라인에서 확인', ['android'], 'xpc/XPC-TP-001.spec.ts', 4);
    await 케이스('XPC-FN-101', '본문 비우고 게시', ['android'], 'xpc/XPC-TP-001.spec.ts', 1);
    await 케이스('XPC-UI-103', '글쓰기 화면 요소', ['android'], 'xpc/XPC-TP-001.spec.ts', 3);
    await 케이스('XPC-FN-102', '500자 넘게 넣기', ['android'], 'xpc/XPC-TP-001.spec.ts', 2);
    // 프로시저에서 빠져 내려간 줄 — 옛 프로시저 번호가 남아 있다
    await 케이스('XPC-FN-301', '빠진 케이스', ['android'], 'xpc/XPC-TP-001.spec.ts', 5, false);
    await 케이스('XPC-FN-201', '옛 꼴 앱 케이스', ['android'], 'xpc/XPC-FN-201.spec.ts', null);
    await 케이스('XPCW-FN-001', '옛 꼴 웹 케이스', ['desktop', 'mobile'], 'xpcw/XPCW-FN-001.spec.ts', null);
    await 케이스('XPCW-UI-001', '옛 꼴 웹 UI 케이스', ['desktop'], 'xpcw/XPCW-UI-001.spec.ts', null);
    await q(`INSERT INTO case_input (tc_id, params, expected, saved_by) VALUES ('XPC-FN-104', '{"본문":"저장한 본문"}', '{}', 'xpc')`);
  });

  beforeEach(실행을치운다);

  afterAll(async () => {
    await 치운다();
    const { pool } = await import('../db/index.js');
    await pool.end();
  });

  it('옛 꼴 케이스만 든 실행은 케이스 줄마다 실행 단위 한 줄이 생기고 번호가 케이스 줄 번호와 같다', async () => {
    const 능력 = vi.fn(돈다);
    const { runId, items, procSkipped } = await createRun(
      요청([{ tcId: 'XPCW-FN-001', platforms: ['desktop', 'mobile'], params: {}, expected: {}, timeoutMs: 5000 }], { repeat: 2 }),
      능력,
    );

    const 줄 = await 케이스줄(runId);
    expect(줄.map((r) => [r.tc_id, r.attempt, r.exec_seq, r.timeout_ms])).toEqual([
      ['XPCW-FN-001', 1, 1, 5000],
      ['XPCW-FN-001', 2, 1, 5000],
      ['XPCW-FN-001', 1, 1, 5000],
      ['XPCW-FN-001', 2, 1, 5000],
    ]);
    expect(줄.map((r) => r.exec_id)).toEqual(줄.map((r) => r.history_id));
    expect((await 단위줄(runId)).map((e) => [e.exec_id, e.file_path, e.proc_id, e.proc_name, e.platform, e.attempt, e.timeout_ms])).toEqual(
      줄.map((r, k) => [r.history_id, 'xpcw/XPCW-FN-001.spec.ts', null, null, k < 2 ? 'desktop' : 'mobile', r.attempt, 5000]),
    );
    expect(items.map((i) => String(i.historyId))).toEqual(줄.map((r) => r.history_id));
    expect(procSkipped).toBe(0);
    // 프로시저 안 케이스가 없으면 러너에 묻지 않는다
    expect(능력).not.toHaveBeenCalled();
  });

  it('프로시저 안 케이스 하나를 고르면 그 프로시저의 활성 케이스 전부가 실행 단위 한 줄 아래에 차례대로 선다', async () => {
    const { runId } = await createRun(요청([앱항목('XPC-FN-102', { params: { 본문: '보낸 본문' }, timeoutMs: 5000 })]), 돈다);

    const 단위 = await 단위줄(runId);
    expect(단위.map((e) => [e.file_path, e.proc_id, e.proc_name, e.platform, e.attempt, e.timeout_ms])).toEqual([
      ['xpc/XPC-TP-001.spec.ts', 프로시저, '글쓰기 — 입력 제한부터 게시까지', 'android', 1, 1_200_000],
    ]);
    const 줄 = await 케이스줄(runId);
    // 내려간 줄(XPC-FN-301)은 안 든다. 요청이 줄여 보낸 한도는 버리고 늘 기본값이다
    expect(줄.map((r) => [r.tc_id, r.exec_seq, r.timeout_ms])).toEqual([
      ['XPC-FN-101', 1, 300_000],
      ['XPC-FN-102', 2, 300_000],
      ['XPC-UI-103', 3, 300_000],
      ['XPC-FN-104', 4, 300_000],
    ]);
    expect(new Set(줄.map((r) => r.exec_id))).toEqual(new Set([단위[0]!.exec_id]));
    // 새 번호는 프로시저 실행 단위만 뽑는다 — 케이스 줄 번호와 겹치지 않는다
    expect(줄.map((r) => r.history_id)).not.toContain(단위[0]!.exec_id);
    // 고른 케이스는 보낸 값, 펼쳐서 든 케이스는 저장값이다. 저장값도 없는 칸은 비워 둔다 — 코드 기본값은 kit 이 돌 때 채운다
    expect(줄.map((r) => r.params.본문)).toEqual([undefined, '보낸 본문', undefined, '저장한 본문']);

    const 실행 = (await q<{ kind: string; title: string }>('SELECT kind, title FROM test_run WHERE run_id = $1', [runId])).rows[0]!;
    // -UI- 케이스가 섞여도 기능 하나다. 제목은 펼치기 전에 고른 케이스로 짓는다
    expect(실행).toEqual({ kind: 'FN', title: 'XPC-FN-102 500자 넘게 넣기' });
  });

  it('프로시저와 옛 꼴 케이스가 한 실행에 섞이고 반복은 프로시저를 통째로 그 횟수만큼 돌린다', async () => {
    const { runId } = await createRun(요청([앱항목('XPC-FN-201'), 앱항목('XPC-UI-103'), 앱항목('XPC-FN-101')], { repeat: 2 }), 돈다);

    const 단위 = await 단위줄(runId);
    expect(단위.map((e) => [e.proc_id, e.attempt, e.timeout_ms])).toEqual([
      [null, 1, 300_000],
      [null, 2, 300_000],
      [프로시저, 1, 1_200_000],
      [프로시저, 2, 1_200_000],
    ]);
    const 줄 = await 케이스줄(runId);
    expect(줄).toHaveLength(10);
    expect(줄.filter((r) => r.exec_id === 단위[3]!.exec_id).map((r) => [r.tc_id, r.exec_seq, r.attempt])).toEqual([
      ['XPC-FN-101', 1, 2],
      ['XPC-FN-102', 2, 2],
      ['XPC-UI-103', 3, 2],
      ['XPC-FN-104', 4, 2],
    ]);
  });

  it('그 애플리케이션의 활성 케이스를 다 고르면 제목이 「기능 전체」다 — UI · 기능으로 가르지 않는다', async () => {
    const { runId } = await createRun(요청(['XPC-FN-101', 'XPC-FN-102', 'XPC-UI-103', 'XPC-FN-104', 'XPC-FN-201'].map((t) => 앱항목(t))), 돈다);
    expect((await q<{ title: string }>('SELECT title FROM test_run WHERE run_id = $1', [runId])).rows[0]!.title).toBe('기능 전체 5건');
  });

  it('프로시저에서 빠져 내려간 케이스를 직접 고르면 사람이 건 실행은 CASE_NOT_FOUND 로 거절하고 자동 실행은 그 케이스만 뺀다', async () => {
    await expect(createRun(요청([앱항목('XPC-FN-301'), 앱항목('XPC-FN-101')]), 돈다)).rejects.toMatchObject({ code: 'CASE_NOT_FOUND' });
    expect((await q(`SELECT 1 FROM test_run WHERE service_id IN ${서비스들}`)).rowCount).toBe(0);

    const { runId } = await createRun(요청([앱항목('XPC-FN-301'), 앱항목('XPC-FN-201')], { origin: 'BUILD' }), 돈다);
    expect((await 케이스줄(runId)).map((r) => r.tc_id)).toEqual(['XPC-FN-201']);
    await expect(createRun(요청([앱항목('XPC-FN-301')], { origin: 'BUILD' }), 돈다)).rejects.toMatchObject({ code: 'NO_ITEMS' });
  });

  it('러너가 프로시저를 못 돌면 사람이 건 실행은 RUNNER_NO_PROCEDURE 로 거절하고 실행을 만들지 않는다', async () => {
    const err = await createRun(요청([앱항목('XPC-FN-201'), 앱항목('XPC-FN-101')]), 못돈다).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(RunInputError);
    expect((err as RunInputError).code).toBe('RUNNER_NO_PROCEDURE');
    expect((await q(`SELECT 1 FROM test_run WHERE service_id IN ${서비스들}`)).rowCount).toBe(0);
  });

  it('자동 실행은 프로시저 안 케이스만 빼고 만들고, 남는 것이 없으면 NO_ITEMS 다', async () => {
    const 빌드 = { origin: 'BUILD' as const };
    const { runId, procSkipped } = await createRun(요청([앱항목('XPC-FN-201'), 앱항목('XPC-FN-101'), 앱항목('XPC-FN-102')], 빌드), 못돈다);
    expect((await 케이스줄(runId)).map((r) => r.tc_id)).toEqual(['XPC-FN-201']);
    expect(procSkipped).toBe(2);

    await expect(createRun(요청([앱항목('XPC-FN-101')], 빌드), 못돈다)).rejects.toMatchObject({ code: 'NO_ITEMS' });
  });

  it('정식 실행은 러너의 /health 를 보고 받는다 — procedure 가 없는 러너면 409 RUNNER_NO_PROCEDURE, 있으면 프로시저를 펼쳐 만든다', async () => {
    const 팜 = process.env.DEVICE_FARM_URL;
    const 러너 = process.env.RUNNER_URL;
    process.env.DEVICE_FARM_URL = 'http://127.0.0.1:9';
    let 능력: Record<string, unknown> = { ok: true };
    const 가짜러너 = Fastify();
    가짜러너.get('/health', async () => 능력);
    process.env.RUNNER_URL = await 가짜러너.listen({ port: 0, host: '127.0.0.1' });
    const app = Fastify();
    await app.register(executionRoutes, { prefix: '/api' });
    const 건다 = () => app.inject({ method: 'POST', url: '/api/runs', payload: { env: 'qa', items: [앱항목('XPC-FN-101')] } });
    try {
      const 거절 = await 건다();
      expect(거절.statusCode).toBe(409);
      expect(거절.json()).toEqual({ error: 'RUNNER_NO_PROCEDURE' });

      능력 = { ok: true, procedure: true };
      const 받음 = await 건다();
      expect(받음.statusCode).toBeLessThan(300);
      const runId = (받음.json() as { runId: number }).runId;
      expect((await 단위줄(runId)).map((u) => u.proc_id)).toEqual([프로시저]);
      expect((await 케이스줄(runId)).map((r) => r.tc_id)).toEqual(['XPC-FN-101', 'XPC-FN-102', 'XPC-UI-103', 'XPC-FN-104']);
    } finally {
      await app.close();
      await 가짜러너.close();
      if (팜 === undefined) delete process.env.DEVICE_FARM_URL;
      else process.env.DEVICE_FARM_URL = 팜;
      if (러너 === undefined) delete process.env.RUNNER_URL;
      else process.env.RUNNER_URL = 러너;
    }
  });

  it('스모크 판정은 프로시저 안 줄 가운데 스모크 표시가 없는 케이스만 빼고 본다', async () => {
    await q("UPDATE test_case SET smoke = true WHERE tc_id = 'XPC-FN-101'");
    const 판정 = async (runId: number) =>
      (await q<{ 안통과: boolean }>(`SELECT ${스모크안통과()} AS "안통과" FROM test_run t WHERE t.run_id = $1`, [runId])).rows[0]!.안통과;
    const 끝낸다 = (runId: number, 판: Record<string, string>) =>
      Promise.all(Object.entries(판).map(([tcId, status]) => q('UPDATE run_item SET status = $3, finished_at = now() WHERE run_id = $1 AND tc_id = $2', [runId, tcId, status])));
    try {
      const { runId } = await createRun(요청([앱항목('XPC-FN-101')]), 돈다);
      // 같은 프로시저의 스모크 아닌 케이스가 실패해도 스모크는 통과다
      await 끝낸다(runId, { 'XPC-FN-101': 'PASS', 'XPC-FN-102': 'FAIL', 'XPC-UI-103': 'NA', 'XPC-FN-104': 'PASS' });
      expect(await 판정(runId)).toBe(false);
      // 스모크 케이스가 앞 케이스에 막혀 미실행이면 통과가 아니다
      await 끝낸다(runId, { 'XPC-FN-101': 'NA' });
      expect(await 판정(runId)).toBe(true);

      // 옛 꼴 케이스 줄은 스모크 표시와 상관없이 전처럼 전부 본다
      const 옛 = await createRun(요청([앱항목('XPC-FN-201')]), 돈다);
      await 끝낸다(옛.runId, { 'XPC-FN-201': 'FAIL' });
      expect(await 판정(옛.runId)).toBe(true);
      await 끝낸다(옛.runId, { 'XPC-FN-201': 'PASS' });
      expect(await 판정(옛.runId)).toBe(false);
    } finally {
      await q("UPDATE test_case SET smoke = false WHERE tc_id = 'XPC-FN-101'");
    }
  });

  it('빌드 실행은 「프로시저 작성」을 켠 애플리케이션을 UI · 기능으로 나누지 않고 실행 하나로 만든다', async () => {
    const 팜 = process.env.DEVICE_FARM_URL;
    const 러너 = process.env.RUNNER_URL;
    process.env.DEVICE_FARM_URL = 'http://127.0.0.1:9';
    // 프로시저를 못 도는 판의 러너 — /health 에 procedure 가 없다
    const 가짜러너 = Fastify();
    가짜러너.get('/health', async () => ({ ok: true }));
    process.env.RUNNER_URL = await 가짜러너.listen({ port: 0, host: '127.0.0.1' });
    const 빌드 = (await q<{ id: string }>(
      `INSERT INTO app_build (service_id, env, build_no, app_url, uploaded_by) SELECT id, 'qa', '7', 'https://builds.example.com/xpc-7.apk', 'xpc' FROM service WHERE prefix = 'XPC' RETURNING id`,
    )).rows[0]!;
    const 말: string[] = [];
    try {
      const 만든 = await 정기실행을만든다('XPC', 'qa', { info: (글) => 말.push(글), error: (글) => 말.push(`오류: ${글}`) }, { id: Number(빌드.id), buildNo: '7', stage: 'FULL', username: 'xpc', displayName: 'XPC' });
      await 만든.끝;
      // 러너가 프로시저를 못 돌아 그 케이스 넷이 빠지고 옛 꼴 하나가 남는다. 나눴으면 UI 묶음(XPC-UI-103 하나)은 따로 서려다 비어서 안 섰다
      expect(만든).toMatchObject({ 실패: false });
      expect(만든.runIds).toHaveLength(1);
      expect(말.filter((글) => 글.includes('뺐다'))).toEqual([expect.stringContaining('프로시저 안 케이스 4건은 뺐다')]);
      expect(말.some((글) => 글.includes('UI 테스트'))).toBe(false);
      expect((await q<{ kind: string; title: string }>('SELECT kind, title FROM test_run WHERE run_id = $1', [만든.runIds[0]])).rows[0]).toEqual({ kind: 'FN', title: '빌드 7 · XPC-FN-201 옛 꼴 앱 케이스' });
    } finally {
      await 실행을치운다();
      await q('DELETE FROM app_build WHERE id = $1', [빌드.id]);
      await 가짜러너.close();
      if (팜 === undefined) delete process.env.DEVICE_FARM_URL;
      else process.env.DEVICE_FARM_URL = 팜;
      if (러너 === undefined) delete process.env.RUNNER_URL;
      else process.env.RUNNER_URL = 러너;
    }
  });

  it('「프로시저 작성」이 꺼진 애플리케이션은 UI · 기능이 섞이면 지금처럼 MIXED_KIND 다', async () => {
    const 섞임 = [
      { tcId: 'XPCW-FN-001', platforms: ['desktop' as const], params: {}, expected: {} },
      { tcId: 'XPCW-UI-001', platforms: ['desktop' as const], params: {}, expected: {} },
    ];
    await expect(createRun(요청(섞임), 돈다)).rejects.toMatchObject({ code: 'MIXED_KIND' });
  });
});
