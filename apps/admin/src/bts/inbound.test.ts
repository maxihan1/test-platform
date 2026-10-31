// BTS 알림(HMAC) · 규칙 웹훅 호출(btr_) 두 문 — 서명 · 토큰 · 같은 알림 한 번 · 이슈 다시 읽기 (도메인/BTS §7). DB 검사는 DATABASE_URL 이 있을 때만 돈다

import { createHmac } from 'node:crypto';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 토큰해시 } from '../auth/agentToken.js';
import { 인증등록 } from '../auth/gate.js';
import { 세션등록 } from '../auth/session.js';

import type { BTS자리 } from './client.js';
import btsInboundRoutes, { BTS알림처리, 서명맞나 } from './inbound.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XBW';
const 비밀 = 'whsec-xbw';
const 서명 = (몸: string, 열쇠 = 비밀) => `sha256=${createHmac('sha256', 열쇠).update(몸).digest('hex')}`;

describe('서명 맞추기', () => {
  it('받은 바이트 그대로의 HMAC 만 맞다', () => {
    const 몸 = '{"event":"issue.created"}';
    expect(서명맞나(비밀, Buffer.from(몸), 서명(몸))).toBe(true);
    expect(서명맞나(비밀, Buffer.from(`${몸} `), 서명(몸))).toBe(false);
    expect(서명맞나(비밀, Buffer.from(몸), 서명(몸, 'other'))).toBe(false);
    expect(서명맞나(비밀, Buffer.from(몸), 'sha256=00')).toBe(false);
  });
});

describe.skipIf(연결 === undefined)('BTS 가 부르는 두 문', () => {
  let app: FastifyInstance;
  let 프로젝트 = 0;
  let 서비스 = 0;
  const 규칙토큰 = 'btr_xbw-rule-token';
  const 부른것: string[] = [];
  let 깨짐 = false;
  const 부르기 = async (자리: BTS자리, method: string, 경로: string) => {
    부른것.push(`${자리.botKey} ${method} ${경로}`);
    if (깨짐) return { status: 502, json: null };
    return { status: 200, json: { data: { key: 'XBW-7', currentStateKey: 'closed', resolution: { name: '흔들림' }, typeKey: 'bug', summary: '요약' } } };
  };
  const pool = async () => (await import('../db/index.js')).pool;
  const 알림 = (몸: string, 헤더: Record<string, string> = { 'x-bts-signature': 서명(몸) }, id = 프로젝트) =>
    app.inject({ method: 'POST', url: `/api/bts/events/${String(id)}`, payload: 몸, headers: { 'content-type': 'application/json', ...헤더 } });
  const 규칙 = (몸: unknown, 토큰: string | null = 규칙토큰) =>
    app.inject({
      method: 'POST',
      url: '/api/bts/rules',
      payload: JSON.stringify(몸),
      headers: { 'content-type': 'application/json', ...(토큰 !== null && { 'x-qahub-token': 토큰 }) },
    });

  beforeAll(async () => {
    app = Fastify();
    await app.register(btsInboundRoutes, { prefix: '/api', 부르기 });
    await app.ready();
    const p = await pool();
    await p.query(
      "INSERT INTO app_user (username, display_name, password_hash, role, is_approved, must_change_password) VALUES ('xbw-admin', 'xbw', NULL, 'admin', true, false)",
    );
    프로젝트 = Number((await p.query<{ id: string }>(`INSERT INTO project (name) VALUES ('${접두사} 프로젝트') RETURNING id`)).rows[0]!.id);
    서비스 = Number(
      (
        await p.query<{ id: string }>(
          `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1, '#112233', '', 'xbw', $2) RETURNING id`,
          [접두사, 프로젝트],
        )
      ).rows[0]!.id,
    );
    await p.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_key, webhook_secret, status_map, resolution_map, updated_by,
                             rule_token_hash, rule_token_tail, rule_token_by, rule_token_at)
       VALUES ($1, 'https://bts.example.com', 'XBW', 'pat_xbw', $2, '{}', '{}', 'xbw-admin', $3, 'oken', 'xbw-admin', now())`,
      [프로젝트, 비밀, 토큰해시(규칙토큰)],
    );
  });

  afterAll(async () => {
    const p = await pool();
    // bts_link 는 project 와 같이 지워진다
    await p.query('DELETE FROM service WHERE id = $1', [서비스]);
    await p.query('DELETE FROM project WHERE id = $1', [프로젝트]);
    await p.query("DELETE FROM app_user WHERE username = 'xbw-admin'");
    await app.close();
  });

  const 연결값 = () => ({ projectId: 프로젝트, baseUrl: 'https://bts.example.com', botKey: 'pat_xbw', btsProject: 'XBW' });

  it('서명이 없거나 틀리면 401 BAD_SIGNATURE · 연결 없는 프로젝트도 같은 401', async () => {
    const 몸 = JSON.stringify({ event: 'issue.created', deliveryId: 'd0', data: { issueKey: 'XBW-1' } });
    expect((await 알림(몸, {})).json()).toEqual({ error: 'BAD_SIGNATURE' });
    const 틀림 = await 알림(몸, { 'x-bts-signature': 서명(몸, 'other') });
    expect([틀림.statusCode, 틀림.json().error]).toEqual([401, 'BAD_SIGNATURE']);
    expect((await 알림(몸, { 'x-bts-signature': 서명(몸) }, 999999999)).json()).toEqual({ error: 'BAD_SIGNATURE' });
    expect((await 알림(몸)).statusCode).toBe(204);
  });

  it('64KB 를 넘는 몸은 받지 않는다', async () => {
    const 큰몸 = JSON.stringify({ event: 'issue.created', deliveryId: 'big', data: { issueKey: 'XBW-1' }, pad: 'x'.repeat(70_000) });
    expect((await 알림(큰몸)).statusCode).toBe(413);
  });

  it('이슈를 「QA Hub AI」 열쇠로 다시 읽는다 · 같은 알림은 한 번만 · 다른 프로젝트 키 · 모르는 종류는 안 읽는다', async () => {
    const 몸 = { event: 'issue.transitioned', deliveryId: 'd1', data: { issueKey: 'XBW-7', toState: '거짓말' } };
    expect(await BTS알림처리(연결값(), 몸, 부르기)).toEqual({
      key: 'XBW-7', state: 'closed', resolution: '흔들림', assigneeId: null, type: 'bug', summary: '요약', componentIds: [],
    });
    expect(부른것.at(-1)).toBe('pat_xbw GET /api/v1/issues/XBW-7');
    const 앞 = 부른것.length;
    expect(await BTS알림처리(연결값(), 몸, 부르기)).toBeNull();
    expect(await BTS알림처리(연결값(), { ...몸, deliveryId: 'd2', data: { issueKey: 'DM-7' } }, 부르기)).toBeNull();
    expect(await BTS알림처리(연결값(), { ...몸, deliveryId: 'd3', event: 'comment.created' }, 부르기)).toBeNull();
    expect(부른것.length).toBe(앞);
  });

  it('다시 읽기가 깨지면 503 으로 다시 보내게 하고 그 알림을 잊는다 — 다시 오면 처리한다', async () => {
    const 몸 = JSON.stringify({ event: 'issue.transitioned', deliveryId: 'retry', data: { issueKey: 'XBW-7' } });
    깨짐 = true;
    try {
      const 첫 = await 알림(몸);
      expect([첫.statusCode, 첫.json().error]).toEqual([503, 'BTS_UNREACHABLE']);
    } finally {
      깨짐 = false;
    }
    const 앞 = 부른것.length;
    expect((await 알림(몸)).statusCode).toBe(204);
    expect(부른것.length).toBe(앞 + 1);
  });

  it('규칙 웹훅 호출 — Content-Type 없이 글로 와도 받는다(BTS 웹훅 호출은 text/plain)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/bts/rules',
      payload: JSON.stringify({ event: 'ASSIGNEE', issueKey: 'XBW-3', assignee: 'QA Hub AI' }),
      headers: { 'content-type': 'text/plain;charset=UTF-8', 'x-qahub-token': 규칙토큰 },
    });
    expect(res.statusCode).toBe(204);
  });

  it('규칙 웹훅 호출 — btr_ 토큰이 맞아야 하고 그 프로젝트 이슈만 받는다', async () => {
    expect((await 규칙({ event: 'ASSIGNEE', issueKey: 'XBW-3', assignee: 'QA Hub AI' }, null)).statusCode).toBe(401);
    expect((await 규칙({ event: 'ASSIGNEE', issueKey: 'XBW-3', assignee: 'QA Hub AI' }, 'btr_wrong')).statusCode).toBe(401);
    expect((await 규칙({ event: 'ASSIGNEE', issueKey: 'XBW-3', assignee: 'QA Hub AI' })).statusCode).toBe(204);
    expect((await 규칙({ event: 'PR_MERGED', issueKey: 'XBW-3', prNumber: '12', prUrl: 'https://github.com/a/b/pull/12', prTitle: '고침' })).statusCode).toBe(204);
    expect((await 규칙({ event: 'PR_MERGED', issueKey: 'XBW-3' })).statusCode).toBe(400);
    // BTS 자동 설정이 만드는 규칙 몸 — 담당자 · PR 제목이 없다
    expect((await 규칙({ event: 'ASSIGNEE', issueKey: 'XBW-3' })).statusCode).toBe(204);
    expect((await 규칙({ event: 'PR_MERGED', issueKey: 'XBW-3', prNumber: '12', prUrl: 'https://github.com/a/b/pull/12' })).statusCode).toBe(204);
    expect((await 규칙({ event: 'ASSIGNEE', issueKey: 'DM-3', assignee: 'x' })).statusCode).toBe(400);
  });

  it('토큰을 만든 admin 이 꺼지면 규칙 토큰도 못 쓴다', async () => {
    const p = await pool();
    await p.query("UPDATE app_user SET is_active = false WHERE username = 'xbw-admin'");
    try {
      expect((await 규칙({ event: 'ASSIGNEE', issueKey: 'XBW-3', assignee: 'x' })).statusCode).toBe(401);
    } finally {
      await p.query("UPDATE app_user SET is_active = true WHERE username = 'xbw-admin'");
    }
  });

  it('진짜 문을 거쳐도 로그인 없이 닿는다 · 세션 없이 401 이 아니라 각자 문이 판정한다', async () => {
    // app.ts 는 불러오면 기동해 버려 문만 같은 순서로 세운다
    const 진짜 = Fastify();
    세션등록(진짜, 'x'.repeat(64));
    인증등록(진짜);
    await 진짜.register(btsInboundRoutes, { prefix: '/api', 부르기 });
    await 진짜.ready();
    try {
      const 몸 = JSON.stringify({ event: 'issue.created', deliveryId: 'gate', data: { issueKey: 'XBW-9' } });
      const 없음 = await 진짜.inject({ method: 'POST', url: `/api/bts/events/${String(프로젝트)}`, payload: 몸, headers: { 'content-type': 'application/json' } });
      expect(없음.json()).toEqual({ error: 'BAD_SIGNATURE' });
      const 맞음 = await 진짜.inject({
        method: 'POST', url: '/api/bts/rules', payload: JSON.stringify({ event: 'ASSIGNEE', issueKey: 'XBW-3', assignee: 'x' }),
        headers: { 'content-type': 'application/json', 'x-qahub-token': 규칙토큰 },
      });
      expect(맞음.statusCode).toBe(204);
    } finally {
      await 진짜.close();
    }
  });
});
