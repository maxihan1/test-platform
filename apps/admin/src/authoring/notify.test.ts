// 작성 완료 Slack 알림 — 본문 모양과 끝내기 통로가 한 번만 보내는지 (DB 접속이 있을 때만 통로 검사가 돈다)
import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import authoringAgentRoutes from './agentRoutes.js';
import { 본문, 알림이끝나길기다린다, type 알릴것 } from './notify.js';
import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XWF';
const 맥 = 'xwf-맥';
const 웹훅 = 'https://hooks.example.com/xwf';

const 기본: 알릴것 = {
  status: 'DONE',
  서비스이름: '데모마켓',
  뿌리: 12,
  제목: '테스트 작성',
  caseFiles: 7,
  확인필요: 3,
  ms: 125_000,
  error: null,
  prUrl: 'https://github.com/acme/demo/pull/9',
};

describe('작성 완료 알림 본문', () => {
  it('완료는 머리 · 파일 수와 확인 필요와 시간 · PR · 결과 보기 순이다', () => {
    expect(본문(기본, 'https://qa.example.com/')).toBe(
      [
        '[완료] 데모마켓 · 작성 요청 #12 · 테스트 작성',
        '스크립트 파일 7개 · PRD 확인 필요 3건 · 걸린 시간 2분 05초',
        'PR https://github.com/acme/demo/pull/9',
        '',
        '결과 보기 https://qa.example.com/#/authoring/12',
      ].join('\n'),
    );
  });

  it('칸이 없는 조각만 빼고 주소를 모르면 링크 줄을 뺀다', () => {
    expect(본문({ ...기본, caseFiles: null, 확인필요: null, prUrl: null }, '')).toBe(
      ['[완료] 데모마켓 · 작성 요청 #12 · 테스트 작성', '걸린 시간 2분 05초'].join('\n'),
    );
    expect(본문({ ...기본, caseFiles: null, 확인필요: null, ms: null, prUrl: null }, '')).toBe(
      '[완료] 데모마켓 · 작성 요청 #12 · 테스트 작성',
    );
  });

  it('실패는 파일 수 줄 대신 오류 첫 줄을 싣고 중단은 머리만 바뀐다', () => {
    expect(본문({ ...기본, status: 'FAILED', error: '러너가 응답하지 않았습니다', prUrl: null }, '')).toBe(
      ['[실패] 데모마켓 · 작성 요청 #12 · 테스트 작성', '러너가 응답하지 않았습니다'].join('\n'),
    );
    expect(본문({ ...기본, status: 'STOPPED', error: '시간 초과', prUrl: null }, '')).toBe(
      '[중단] 데모마켓 · 작성 요청 #12 · 테스트 작성',
    );
  });
});

describe.skipIf(연결 === undefined)('끝내기 통로의 Slack 알림', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const 앞주소 = process.env.PLATFORM_PUBLIC_URL;
  const 보냄 = vi.fn<(url: string, init: { body: string }) => Promise<{ ok: boolean }>>();

  const q = async (sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query(sql, 값);
  };

  const 넣기 = async (칸: { 멈춤요청?: boolean } = {}): Promise<number> => {
    const r = await q(
      `INSERT INTO authoring_request (service_id, kind, requested_by, requested_by_name, status, claimed_by, started_at, progress, stop_requested_at, stop_requested_by)
       VALUES ($1, 'AUTHOR', 'xwf1', '요청자', 'RUNNING', $2, now() - interval '2 minutes', '{"caseFiles":3}',
               CASE WHEN $3::boolean THEN now() ELSE NULL END, CASE WHEN $3::boolean THEN 'xwf1' ELSE NULL END)
       RETURNING id`,
      [서비스, 맥, 칸.멈춤요청 === true],
    );
    return Number((r.rows[0] as { id: string }).id);
  };
  const 웹훅쓰기 = (주소: string | null) => q('UPDATE service SET slack_webhook = $2 WHERE id = $1', [서비스, 주소]);
  // Slack 은 응답을 붙잡지 않고 뒤에서 나간다 — 보낸 결과를 보는 검사는 그 일이 끝나길 기다린 뒤에 본다
  const 끝내기 = (id: number, 본문: object) =>
    app.inject({ method: 'POST', url: `/api/authoring/requests/${id}/finish`, payload: 본문 });
  const 끝내고기다리기 = async (id: number, 본문: object) => {
    const 응답 = await 끝내기(id, 본문);
    await 알림이끝나길기다린다();
    return 응답;
  };
  const 치우기 = async () => {
    await q('DELETE FROM prd_version WHERE service_id = $1', [서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
  };

  beforeAll(async () => {
    const r = await q(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, 'XWF 작성 알림 검사용', '#3A5FCD', 'https://github.com/acme/xwf', 'xwf')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사],
    );
    서비스 = Number((r.rows[0] as { id: string }).id);
    await 치우기();
    process.env.AUTHORING_AGENT_USER = 맥;
    process.env.PLATFORM_PUBLIC_URL = 'https://qa.example.com';
    vi.stubGlobal('fetch', 보냄);

    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 맥, displayName: 맥, role: 'member', dashboard: 'read', mustChangePassword: false, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterEach(() => {
    보냄.mockReset();
    보냄.mockResolvedValue({ ok: true });
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    if (앞주소 === undefined) delete process.env.PLATFORM_PUBLIC_URL;
    else process.env.PLATFORM_PUBLIC_URL = 앞주소;
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  it('웹훅이 있으면 끝낸 한 번에 한 번 보낸다 — 파일 수 · PRD 확인 필요 · 결과 보기 주소', async () => {
    await 치우기();
    await 웹훅쓰기(웹훅);
    await q(
      `INSERT INTO prd_version (service_id, version, items, last_no, source, saved_by, saved_by_name)
       VALUES ($1, 1, $2::jsonb, 1, 'PERSON', 'xwf', 'XWF')`,
      [서비스, JSON.stringify([{ reqId: 'XWF-REQ-001', feature: '로그인', text: '규칙', basis: [], status: 'NEEDS_CHECK', checkSince: '2026-10-01T00:00:00.000Z' }])],
    );
    const id = await 넣기();

    const 응답 = await 끝내고기다리기(id, { status: 'DONE' });

    expect(응답.statusCode).toBe(200);
    expect(보냄).toHaveBeenCalledTimes(1);
    const [주소, 요청] = 보냄.mock.calls[0]!;
    expect(주소).toBe(웹훅);
    const { text } = JSON.parse(요청.body) as { text: string };
    expect(text).toContain(`[완료] XWF 작성 알림 검사용 · 작성 요청 #${id} · 테스트 작성`);
    expect(text).toContain('스크립트 파일 3개 · PRD 확인 필요 1건 · 걸린 시간 2분');
    expect(text).toContain(`결과 보기 https://qa.example.com/#/authoring/${id}`);
  });

  it('Slack 이 응답하지 않아도 끝내기는 바로 200 이다', async () => {
    await 치우기();
    await 웹훅쓰기(웹훅);
    let 풀어주기 = (): void => {};
    보냄.mockReturnValue(new Promise((완료) => { 풀어주기 = () => 완료({ ok: true }); }));
    const id = await 넣기();

    const 응답 = await 끝내기(id, { status: 'DONE' });

    expect(응답.statusCode).toBe(200);
    const 행 = await q('SELECT status FROM authoring_request WHERE id = $1', [id]);
    expect((행.rows[0] as { status: string }).status).toBe('DONE');
    await vi.waitFor(() => expect(보냄).toHaveBeenCalledTimes(1));
    풀어주기();
    await 알림이끝나길기다린다();
  });

  it('웹훅이 없으면 안 보낸다', async () => {
    await 치우기();
    await 웹훅쓰기(null);
    const id = await 넣기();

    expect((await 끝내고기다리기(id, { status: 'DONE' })).statusCode).toBe(200);
    expect(보냄).not.toHaveBeenCalled();
  });

  it('이미 끝난 요청에 다시 끝내기가 오면 409 이고 다시 안 보낸다', async () => {
    await 치우기();
    await 웹훅쓰기(웹훅);
    const id = await 넣기();

    expect((await 끝내고기다리기(id, { status: 'DONE' })).statusCode).toBe(200);
    expect((await 끝내고기다리기(id, { status: 'DONE' })).statusCode).toBe(409);
    expect(보냄).toHaveBeenCalledTimes(1);
  });

  it('보내기가 실패해도 끝내기는 200 이고 상태는 그대로 남는다', async () => {
    await 치우기();
    await 웹훅쓰기(웹훅);
    보냄.mockRejectedValue(new Error('network down'));
    const id = await 넣기();

    expect((await 끝내고기다리기(id, { status: 'FAILED', error: '러너 오류' })).statusCode).toBe(200);
    const 행 = await q('SELECT status FROM authoring_request WHERE id = $1', [id]);
    expect((행.rows[0] as { status: string }).status).toBe('FAILED');
  });

  it('사람이 멈춰 달라고 해서 멈춘 것은 보내지 않고 시간 초과로 멈춘 것은 중단으로 보낸다', async () => {
    await 치우기();
    await 웹훅쓰기(웹훅);
    const 사람이 = await 넣기({ 멈춤요청: true });
    expect((await 끝내고기다리기(사람이, { status: 'STOPPED', stopReason: 'USER' })).statusCode).toBe(200);
    expect(보냄).not.toHaveBeenCalled();

    const 시간초과 = await 넣기();
    expect((await 끝내고기다리기(시간초과, { status: 'STOPPED', stopReason: 'TIMEOUT' })).statusCode).toBe(200);
    expect(보냄).toHaveBeenCalledTimes(1);
    expect((JSON.parse(보냄.mock.calls[0]![1].body) as { text: string }).text).toContain('[중단] XWF 작성 알림 검사용');
  });
});
