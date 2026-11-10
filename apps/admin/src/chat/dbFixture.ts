// Scout DB 검사 판 — 프로젝트 둘 · 애플리케이션 둘 · 사람 셋 · 작성 계정 하나와 진짜 문 · 출입증 · MCP 를 붙인 앱. 접두사마다 따로 차리고 자기 것만 치운다

import Fastify, { type FastifyInstance, type LightMyRequestResponse } from 'fastify';
import { vi } from 'vitest';

import { 에이전트토큰만들기 } from '../auth/agentToken.js';
import { 인증등록 } from '../auth/gate.js';
import { 해시 } from '../auth/password.js';
import authRoutes from '../auth/routes.js';
import { 세션등록 } from '../auth/session.js';
import type { 부르기함수 } from '../bts/client.js';
import mcpRoutes from '../mcp/server.js';
import chatAgentRoutes from './agentRoutes.js';
import chatRoutes from './routes.js';

const 비밀번호 = '챗봇검사-비밀번호';

export interface 챗봇판 {
  app: FastifyInstance;
  내프로젝트: number;
  남프로젝트: number;
  /** 사람 셋 — 나(Auth 없음) · 남(Auth 없음) · 묶인 사람(auth_sub 있음). 나와 묶인 사람은 두 프로젝트에 다 배정돼 있다 */
  계정: { 나: string; 남: string; 묶인: string; 작성: string };
  작성토큰: string;
  BTS받은것: { 누구: string; 경로: string }[];
  q: (sql: string, 값?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
  로그인: (username: string) => Promise<Record<string, string>>;
  쿠키: (res: LightMyRequestResponse) => Record<string, string>;
  작성: (method: 'POST', url: string, payload?: unknown) => Promise<LightMyRequestResponse>;
  치우기: () => Promise<void>;
}

export async function 챗봇판차리기(접두사: string): Promise<챗봇판> {
  const 소문자 = 접두사.toLowerCase();
  const 계정 = { 나: `${소문자}-me`, 남: `${소문자}-other`, 묶인: `${소문자}-linked`, 작성: `${소문자}-agent` };
  const 사람들 = Object.values(계정);
  const 앱접두사 = [접두사, `${접두사}B`];
  const q = async (sql: string, 값: unknown[] = []) => (await import('../db/index.js')).pool.query(sql, 값);
  const BTS받은것: 챗봇판['BTS받은것'] = [];
  const 부르기: 부르기함수 = async (자리, _method, 경로) => {
    BTS받은것.push({ 누구: 'userId' in 자리 ? `사람:${자리.userId}` : '봇' in 자리 ? `봇:${자리.봇}` : 'pat', 경로 });
    return { status: 200, json: { content: [{ key: `${접두사}Q-1`, summary: '로그인 실패', currentStateKey: 'OPEN' }], totalElements: 1 } };
  };

  async function 치우기() {
    // 대화는 계정 · 프로젝트와 같이 지워진다. 사용량은 외래 키가 없어 자기 사람 이름으로 지운다
    await q('DELETE FROM chat_usage WHERE username = ANY($1)', [사람들]);
    await q('DELETE FROM chat_conversation WHERE username = ANY($1)', [사람들]);
    await q('DELETE FROM user_project WHERE username = ANY($1)', [사람들]);
    await q('DELETE FROM app_user WHERE username = ANY($1)', [사람들]);
    // 프로젝트는 애플리케이션이 다 지워지면 트리거가 지운다 · bts_link 는 프로젝트와 같이 간다
    await q('DELETE FROM service WHERE prefix = ANY($1)', [앱접두사]);
  }

  vi.stubEnv('AUTHORING_AGENT_USER', 계정.작성);
  await 치우기();
  const 프로젝트 = async (이름: string) => Number((await q('INSERT INTO project (name) VALUES ($1) RETURNING id', [이름])).rows[0].id);
  const 내프로젝트 = await 프로젝트(`${접두사} 프로젝트`);
  const 남프로젝트 = await 프로젝트(`${접두사} 다른 프로젝트`);
  for (const [prefix, 번호] of [[앱접두사[0], 내프로젝트], [앱접두사[1], 남프로젝트]] as const) {
    await q(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1, '#123456', '', $2, $3)`, [prefix, prefix.toLowerCase(), 번호]);
  }
  const 비번해시 = await 해시(비밀번호);
  for (const 이름 of 사람들) {
    await q(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password, auth_sub)
       VALUES ($1, $1, $2, 'member', 'none', true, false, $3)`,
      [이름, 비번해시, 이름 === 계정.묶인 ? `${소문자}-sub` : null],
    );
  }
  const 배정 = async (이름: string, 번호: number, 칸: string, 실행칸 = 칸) =>
    q(`INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, $3, $4, $3)`, [이름, 번호, 칸, 실행칸]);
  await 배정(계정.나, 내프로젝트, 'read');
  await 배정(계정.나, 남프로젝트, 'read');
  await 배정(계정.묶인, 내프로젝트, 'read');
  await 배정(계정.묶인, 남프로젝트, 'read');
  // 남은 실행 칸만 있다 — Scout 는 기능 칸을 안 본다(도구가 따로 본다)
  await 배정(계정.남, 내프로젝트, 'none', 'read');
  await 배정(계정.작성, 내프로젝트, 'write');
  for (const 번호 of [내프로젝트, 남프로젝트]) {
    await q(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_username, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, 'https://bts.chat.test', $2, 'chat-bot', 's', '{}', '{}', 'chat')`,
      [번호, `${접두사}Q`],
    );
  }
  const 토큰 = await 에이전트토큰만들기(계정.작성);
  if (typeof 토큰 !== 'object') throw new Error(`작성 토큰을 못 만들었다: ${토큰}`);

  const app = Fastify();
  세션등록(app, `${소문자}-검사용-세션-열쇠-32글자를-넘긴다-넉넉히`);
  인증등록(app);
  await app.register(authRoutes, { prefix: '/api' });
  await app.register(chatRoutes, { prefix: '/api' });
  await app.register(chatAgentRoutes, { prefix: '/api' });
  await app.register(mcpRoutes, { 부르기 });
  await app.ready();

  const 쿠키 = (res: LightMyRequestResponse): Record<string, string> => {
    const 값 = res.cookies.find((c) => c.name === 'platform_session')?.value;
    return 값 === undefined ? {} : { platform_session: 값 };
  };
  const 로그인 = async (username: string) => 쿠키(await app.inject({ method: 'POST', url: '/api/auth/login', payload: { username, password: 비밀번호 } }));
  const 작성 = (method: 'POST', url: string, payload?: unknown) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${토큰.토큰}` }, ...(payload !== undefined && { payload: payload as Record<string, unknown> }) });

  return { app, 내프로젝트, 남프로젝트, 계정, 작성토큰: 토큰.토큰, BTS받은것, q, 로그인, 쿠키, 작성, 치우기 };
}

/** 작성 서버가 끝을 알릴 때 싣는 사용량 */
export const 사용량 = { tokensInput: 100, tokensOutput: 20, tokensCacheRead: 5, tokensCacheWrite: 1, model: 'claude-sonnet-5-5', toolCalls: 2, durationMs: 3000 };
