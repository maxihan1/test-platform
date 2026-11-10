// Scout 대화 통로 — 화면 통로 · 작성 서버 통로 · 대화 수명을 진짜 문 · 출입증 · DB 로 본다. DATABASE_URL이 있을 때만 돈다

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { 비밀번호도장 } from '../auth/store.js';
import { 사용량, 챗봇판차리기, type 챗봇판 } from './dbFixture.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('Scout 대화 통로', () => {
  let 판: 챗봇판;
  let 나: Record<string, string> = {};

  beforeAll(async () => {
    판 = await 챗봇판차리기('XCQ');
    나 = await 판.로그인(판.계정.나);
  });

  afterAll(async () => {
    await 판?.app.close();
    await 판?.치우기();
    vi.unstubAllEnvs();
  });

  const 열기 = (cookies: Record<string, string>, projectId = 판.내프로젝트) => 판.app.inject({ method: 'GET', url: `/api/chat?projectId=${String(projectId)}`, cookies });
  const 묻기 = (cookies: Record<string, string>, text: unknown, projectId = 판.내프로젝트) =>
    판.app.inject({ method: 'POST', url: '/api/chat/questions', cookies, payload: { projectId, text } });
  const 멈추기 = (cookies: Record<string, string>, id: number) => 판.app.inject({ method: 'POST', url: `/api/chat/questions/${String(id)}/stop`, cookies });
  const 가져가기 = async () => (await 판.작성('POST', '/api/chat/agent/claim')).json<{ question: { id: number; projectName: string; text: string; history: { q: string; a: string }[]; mcpKey: string } | null }>().question;
  const 조각 = (id: number, chunks: unknown) => 판.작성('POST', `/api/chat/agent/questions/${String(id)}/chunks`, { chunks });
  const 끝 = (id: number, status = 'DONE') => 판.작성('POST', `/api/chat/agent/questions/${String(id)}/finish`, { status, usage: 사용량 });
  const 사용량줄 = async (id: number) => (await 판.q('SELECT status, tokens_input, tokens_partial FROM chat_usage WHERE question_id = $1', [id])).rows[0];

  it('배정 없는 프로젝트는 403 · 빈 글과 2,000자 넘는 글은 400 · 도는 질문이 있으면 409 BUSY · ahead 는 앞 대기 수', async () => {
    const 남 = await 판.로그인(판.계정.남);
    expect((await 열기(남, 판.남프로젝트)).json()).toEqual({ error: 'FORBIDDEN' });
    expect((await 묻기(나, '   ')).statusCode).toBe(400);
    expect((await 묻기(나, '가'.repeat(2001))).statusCode).toBe(400);
    expect((await 묻기(나, '널\u0000글자')).statusCode).toBe(400);
    expect((await 묻기(나, '질문', 판.남프로젝트 + 1000)).statusCode).toBe(403);

    const 첫 = await 묻기(나, '가'.repeat(2000));
    expect(첫.statusCode).toBe(201);
    const 첫몸 = 첫.json<{ id: number; ahead: number }>();
    expect((await 묻기(나, '또 묻기')).json()).toEqual({ error: 'BUSY' });
    // 실행 칸만 배정된 사람도 Scout 는 쓴다 — 기능 칸은 도구가 따로 본다
    const 남질문 = await 묻기(남, '남의 질문');
    expect(남질문.json()).toEqual({ id: expect.any(Number), ahead: 첫몸.ahead + 1 });
    // 같은 계정이라도 출입증이 다르면 다른 대화다
    const 다른창 = await 판.로그인(판.계정.나);
    expect((await 열기(다른창)).json()).toEqual({ questions: [] });
    expect((await 멈추기(다른창, 첫몸.id)).statusCode).toBe(404);
    expect((await 열기(나)).json<{ questions: unknown[] }>().questions).toEqual([
      { id: 첫몸.id, text: '가'.repeat(2000), status: 'QUEUED', createdAt: expect.any(String), answer: '', steps: [], lastSeq: 0 },
    ]);

    expect((await 멈추기(나, 첫몸.id)).statusCode).toBe(204);
    expect((await 멈추기(나, 첫몸.id)).json()).toEqual({ error: 'NOT_RUNNING' });
    expect((await 멈추기(남, 남질문.json<{ id: number }>().id)).statusCode).toBe(204);
  });

  it('작성 서버가 가져가 조각을 보내고 끝내면 다시 열기 · 이어 받기가 그 답을 주고, 다음 질문의 history 에 실린다', async () => {
    expect((await 판.app.inject({ method: 'POST', url: '/api/chat/agent/claim', cookies: 나 })).statusCode).toBe(403);
    const { id } = (await 묻기(나, '최근 실행 알려 줘')).json<{ id: number }>();
    const 가져간것 = await 가져가기();
    expect(가져간것).toEqual({ id, projectId: 판.내프로젝트, projectName: 'XCQ 프로젝트', text: '최근 실행 알려 줘', history: expect.any(Array), mcpKey: expect.stringMatching(/^mcq_[A-Za-z0-9_-]{43}$/) });
    expect(await 사용량줄(id)).toEqual({ status: 'RUNNING', tokens_input: null, tokens_partial: null });

    expect((await 조각(id, [{ kind: 'STEP', body: { tool: 'run_list', ref: '12' } }, { kind: 'TEXT', body: '최근 ' }])).statusCode).toBe(204);
    expect((await 조각(id, [{ kind: 'STEP', body: { tool: 'issue_list' } }, { kind: 'STEP_DONE', body: { tool: 'run_list' } }, { kind: 'TEXT', body: '실행은 3건이에요' }])).statusCode).toBe(204);
    expect((await 조각(id, [{ kind: 'STEP', body: '글' }])).statusCode).toBe(400);
    expect((await 조각(id, [])).statusCode).toBe(400);
    expect((await 조각(id, [{ kind: 'TEXT', body: '널\u0000' }])).statusCode).toBe(400);

    const 도는중 = (await 열기(나)).json<{ questions: Record<string, unknown>[] }>().questions.at(-1);
    expect(도는중).toMatchObject({ id, status: 'RUNNING', answer: '최근 실행은 3건이에요', lastSeq: 5, steps: [{ tool: 'run_list', ref: '12', done: true }, { tool: 'issue_list', done: false }] });

    expect((await 끝(id)).statusCode).toBe(204);
    expect(await 사용량줄(id)).toEqual({ status: 'DONE', tokens_input: '100', tokens_partial: false });
    expect((await 조각(id, [{ kind: 'TEXT', body: '늦은 조각' }])).json()).toEqual({ error: 'STOPPED' });

    const 이어 = await 판.app.inject({ method: 'GET', url: `/api/chat/questions/${String(id)}/stream`, cookies: 나, headers: { 'last-event-id': '3' } });
    expect(이어.headers['content-type']).toContain('text/event-stream');
    expect(이어.body).toBe(
      [
        `event: chunk\nid: 4\ndata: ${JSON.stringify({ kind: 'STEP_DONE', body: { tool: 'run_list' } })}\n\n`,
        `event: chunk\nid: 5\ndata: ${JSON.stringify({ kind: 'TEXT', body: '실행은 3건이에요' })}\n\n`,
        `event: end\ndata: ${JSON.stringify({ status: 'DONE' })}\n\n`,
      ].join(''),
    );
    expect((await 판.app.inject({ method: 'GET', url: `/api/chat/questions/${String(id)}/stream?after=4`, cookies: 나 })).body).not.toContain('id: 4');
    expect((await 판.app.inject({ method: 'GET', url: `/api/chat/questions/${String(id)}/stream`, cookies: await 판.로그인(판.계정.나) })).statusCode).toBe(404);

    await 묻기(나, '그중 실패는?');
    expect((await 가져가기())?.history.at(-1)).toEqual({ q: '최근 실행 알려 줘', a: '최근 실행은 3건이에요' });
  });

  it('이어 받기는 도는 질문을 기다리다가 조각과 끝이 오면 15초 깨움을 기다리지 않고 바로 보낸다', async () => {
    await 판.q(`UPDATE chat_question SET status = 'DONE' WHERE status IN ('QUEUED', 'RUNNING') AND conversation_id IN (SELECT id FROM chat_conversation WHERE username = $1)`, [판.계정.나]);
    const { id } = (await 묻기(나, '기다릴 질문')).json<{ id: number }>();
    const 시작 = Date.now();
    const 흐름 = 판.app.inject({ method: 'GET', url: `/api/chat/questions/${String(id)}/stream`, cookies: 나 });
    await new Promise((풀림) => setTimeout(풀림, 300));
    await 가져가기();
    await 조각(id, [{ kind: 'TEXT', body: '바로 와요' }]);
    await 끝(id);
    const 받은것 = (await 흐름).body;
    expect(받은것).toContain(`event: wait\ndata: ${JSON.stringify({ ahead: 0 })}`);
    expect(받은것).toContain(`event: chunk\nid: 1\ndata: ${JSON.stringify({ kind: 'TEXT', body: '바로 와요' })}`);
    expect(받은것.endsWith(`event: end\ndata: ${JSON.stringify({ status: 'DONE' })}\n\n`)).toBe(true);
    expect(Date.now() - 시작).toBeLessThan(5000);
  });

  it('중단한 질문의 조각은 409 STOPPED 이고 끝 알리기는 상태를 바꾸지 않고 사용량만 적는다', async () => {
    const { id } = (await 묻기(나, '멈출 질문')).json<{ id: number }>();
    await 가져가기();
    expect((await 멈추기(나, id)).statusCode).toBe(204);
    expect((await 조각(id, [{ kind: 'TEXT', body: '더' }])).json()).toEqual({ error: 'STOPPED' });
    expect((await 끝(id)).statusCode).toBe(204);
    expect((await 판.q('SELECT status FROM chat_question WHERE id = $1', [id])).rows[0]).toEqual({ status: 'STOPPED' });
    expect(await 사용량줄(id)).toEqual({ status: 'STOPPED', tokens_input: '100', tokens_partial: true });
  });

  it('마지막 조각 뒤 2분 30초가 지난 RUNNING 은 다시 열 때 TIMEOUT 으로 닫힌다', async () => {
    const { id } = (await 묻기(나, '느린 질문')).json<{ id: number }>();
    await 가져가기();
    await 판.q(`UPDATE chat_question SET started_at = now() - interval '151 seconds' WHERE id = $1`, [id]);
    expect((await 열기(나)).json<{ questions: { id: number; status: string }[] }>().questions.find((x) => x.id === id)?.status).toBe('TIMEOUT');
    expect((await 사용량줄(id))?.status).toBe('TIMEOUT');
  });

  it('대화 초기화 · 로그아웃은 도는 질문째 대화를 지우고 사용량은 남긴다', async () => {
    const { id } = (await 묻기(나, '초기화될 질문')).json<{ id: number }>();
    await 가져가기();
    expect((await 판.app.inject({ method: 'DELETE', url: `/api/chat?projectId=${String(판.내프로젝트)}`, cookies: 나 })).statusCode).toBe(204);
    expect((await 열기(나)).json()).toEqual({ questions: [] });
    expect((await 사용량줄(id))?.status).toBe('STOPPED');
    expect((await 조각(id, [{ kind: 'TEXT', body: '더' }])).json()).toEqual({ error: 'STOPPED' });
    expect((await 끝(id)).statusCode).toBe(204);
    expect(await 사용량줄(id)).toEqual({ status: 'STOPPED', tokens_input: '100', tokens_partial: true });

    const 다시로그인할것 = await 판.로그인(판.계정.나);
    await 묻기(다시로그인할것, '다시 로그인하면 지워질 질문');
    const 다시 = await 판.app.inject({ method: 'POST', url: '/api/auth/login', cookies: 다시로그인할것, payload: { username: 판.계정.나, password: '챗봇검사-비밀번호' } });
    expect((await 열기(판.쿠키(다시))).json()).toEqual({ questions: [] });
    expect((await 판.q(`SELECT count(*)::int AS n FROM chat_question q JOIN chat_conversation c ON c.id = q.conversation_id WHERE q.text = '다시 로그인하면 지워질 질문'`)).rows[0]).toEqual({ n: 0 });

    const 남을것 = await 판.로그인(판.계정.나);
    await 묻기(남을것, '남을 질문');
    await 묻기(나, '로그아웃될 질문', 판.남프로젝트);
    expect((await 판.app.inject({ method: 'POST', url: '/api/auth/logout', cookies: 나 })).statusCode).toBe(204);
    expect((await 판.q('SELECT count(*)::int AS n FROM chat_conversation WHERE username = $1', [판.계정.나])).rows[0]).toEqual({ n: 1 });
    나 = 남을것;
  });

  it('대화 키가 없는 옛 출입증은 처음 부를 때 키를 굽고, 24시간 지난 남의 대화는 누가 열든 지운다', async () => {
    const 해시 = (await 판.q('SELECT password_hash FROM app_user WHERE username = $1', [판.계정.남])).rows[0]!.password_hash as string;
    const 옛출입증 = { platform_session: 판.app.encodeSecureSession(판.app.createSecureSession({ username: 판.계정.남, stamp: 비밀번호도장(해시) })) };
    const 첫열기 = await 열기(옛출입증);
    expect(첫열기.json()).toEqual({ questions: [] });
    const 새쿠키 = 판.쿠키(첫열기);
    expect(판.app.decodeSecureSession(새쿠키.platform_session ?? '')?.get('chatKey')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect((await 묻기(새쿠키, '옛 출입증 질문')).statusCode).toBe(201);
    expect((await 열기(새쿠키)).json<{ questions: unknown[] }>().questions).toHaveLength(1);

    await 판.q(`UPDATE chat_conversation SET touched_at = now() - interval '25 hours' WHERE username = $1`, [판.계정.남]);
    await 열기(나);
    expect((await 판.q('SELECT count(*)::int AS n FROM chat_conversation WHERE username = $1', [판.계정.남])).rows[0]).toEqual({ n: 0 });
  });
});
