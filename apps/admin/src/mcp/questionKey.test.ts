// Scout 질문마다 나는 MCP 키 mcq_ — 묻는 사람 권한 · 그 질문의 프로젝트만 · RUNNING 동안만 · Auth 에 안 묶인 사람은 BTS_UNAUTHORIZED 를 실제 DB 로 본다. BTS 는 가짜다. DATABASE_URL이 있을 때만 돈다

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { 사용량, 챗봇판차리기, type 챗봇판 } from '../chat/dbFixture.js';

const 연결 = process.env.DATABASE_URL;

type 답몸 = { result?: { content: { text: string }[] } };

describe.skipIf(연결 === undefined)('MCP 질문마다 키 mcq_', () => {
  let 판: 챗봇판;

  beforeAll(async () => {
    판 = await 챗봇판차리기('XQK');
  });

  beforeEach(() => {
    판.BTS받은것.length = 0;
  });

  afterAll(async () => {
    await 판?.app.close();
    await 판?.치우기();
    vi.unstubAllEnvs();
  });

  const 부르기MCP = (열쇠: string, method: string, params: unknown = {}) =>
    판.app.inject({
      method: 'POST',
      url: '/mcp',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${열쇠}` },
      payload: { jsonrpc: '2.0', id: 1, method, params },
    });
  const 도구 = async (열쇠: string, name: string, args: Record<string, unknown>) => {
    const res = await 부르기MCP(열쇠, 'tools/call', { name, arguments: args });
    expect(res.statusCode).toBe(200);
    return (res.json() as 답몸).result!.content[0]!.text;
  };

  /** 그 사람이 내 프로젝트에 질문을 넣고 작성 서버가 가져간다 */
  async function 묻고가져가기(username: string): Promise<{ id: number; 열쇠: string }> {
    const cookies = await 판.로그인(username);
    const 넣음 = await 판.app.inject({ method: 'POST', url: '/api/chat/questions', cookies, payload: { projectId: 판.내프로젝트, text: '최근 이슈' } });
    expect(넣음.statusCode).toBe(201);
    const 가져간것 = (await 판.작성('POST', '/api/chat/agent/claim')).json<{ question: { id: number; mcpKey: string } }>().question;
    return { id: 가져간것.id, 열쇠: 가져간것.mcpKey };
  }
  const 끝 = (id: number) => 판.작성('POST', `/api/chat/agent/questions/${String(id)}/finish`, { status: 'DONE', usage: 사용량 });

  it('Auth 에 안 묶인 사람의 키는 이슈 도구가 「QA Hub AI」 키로 넘어가지 않고 BTS_UNAUTHORIZED 다', async () => {
    const { id, 열쇠 } = await 묻고가져가기(판.계정.나);
    expect(await 도구(열쇠, 'issue_list', { projectId: 판.내프로젝트 })).toContain('BTS_UNAUTHORIZED');
    expect(await 도구(열쇠, 'bts_search', { projectId: 판.내프로젝트, query: '로그인' })).toContain('BTS_UNAUTHORIZED');
    expect(판.BTS받은것).toEqual([]);
    await 끝(id);
  });

  it('묶인 사람의 키는 그 사람 이름으로 BTS 를 부르고, 그 사람이 배정된 다른 프로젝트는 막는다', async () => {
    const { id, 열쇠 } = await 묻고가져가기(판.계정.묶인);
    expect(await 도구(열쇠, 'issue_list', { projectId: 판.내프로젝트 })).toContain('XQKQ-1');
    expect(판.BTS받은것).toEqual([{ 누구: '사람:xqk-sub', 경로: '/api/v1/issues?projectKey=XQKQ&page=0&size=30' }]);
    expect(await 도구(열쇠, 'issue_list', { projectId: 판.남프로젝트 })).toContain('FORBIDDEN');
    expect(판.BTS받은것).toHaveLength(1);
    await 끝(id);
  });

  it('질문이 끝나거나 · 멈춘 지 2분 30초가 지나거나 · 묻는 사람이 꺼지거나 · 작성 계정이 바뀌면 · 틀린 키면 401', async () => {
    const 첫 = await 묻고가져가기(판.계정.나);
    expect((await 부르기MCP(첫.열쇠, 'tools/list')).statusCode).toBe(200);
    await 판.q('UPDATE app_user SET is_active = false WHERE username = $1', [판.계정.나]);
    expect((await 부르기MCP(첫.열쇠, 'tools/list')).statusCode).toBe(401);
    await 판.q('UPDATE app_user SET is_active = true WHERE username = $1', [판.계정.나]);
    vi.stubEnv('AUTHORING_AGENT_USER', 'xqk-바뀐-작성계정');
    expect((await 부르기MCP(첫.열쇠, 'tools/list')).statusCode).toBe(401);
    vi.stubEnv('AUTHORING_AGENT_USER', 판.계정.작성);
    await 판.q(`UPDATE chat_question SET started_at = now() - interval '151 seconds' WHERE id = $1`, [첫.id]);
    expect((await 부르기MCP(첫.열쇠, 'tools/list')).statusCode).toBe(401);
    await 판.q(`UPDATE chat_question SET started_at = now() WHERE id = $1`, [첫.id]);
    expect((await 부르기MCP(첫.열쇠, 'tools/list')).statusCode).toBe(200);
    await 끝(첫.id);
    expect((await 부르기MCP(첫.열쇠, 'tools/list')).statusCode).toBe(401);
    expect((await 판.q('SELECT mcp_key_hash FROM chat_question WHERE id = $1', [첫.id])).rows[0]).toEqual({ mcp_key_hash: null });
    expect((await 부르기MCP('mcq_wrong', 'tools/list')).statusCode).toBe(401);
  });

  it('키는 /mcp 에서만 받는다 — /api 에 내밀면 401', async () => {
    const { id, 열쇠 } = await 묻고가져가기(판.계정.나);
    expect((await 판.app.inject({ method: 'GET', url: `/api/chat?projectId=${String(판.내프로젝트)}`, headers: { authorization: `Bearer ${열쇠}` } })).statusCode).toBe(401);
    await 끝(id);
  });
});
