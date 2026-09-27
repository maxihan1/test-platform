// 작성 중단·폐기 통로와 진척 신호 검사 (SPEC 도메인/작성 §7 「중단 · 폐기 · 진척」)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 등급표, 토큰통로 } from '../auth/gate.js';
import { 라우트표 } from '../auth/scope.js';
import authoringAgentRoutes from './agentRoutes.js';
import authoringAssetRoutes from './assets.js';
import authoringRoutes from './routes.js';
import { 진척검사 } from './stop.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XWT';
const 맥 = 'xwt-맥';
const 사람1 = 'xwt1';

const 좋은진척 = { childRunning: true, elapsedSec: 60, limitSec: 3600, caseFiles: 1, tokens: 100 };

describe('진척 모양', () => {
  it('정해진 칸만 받는다', () => {
    expect(진척검사(좋은진척)).toEqual(좋은진척);
    const 전부 = { ...좋은진척, screens: 2, lastAction: 'Read', lastActionAt: '2026-09-27T00:00:00.000Z' };
    expect(진척검사(전부)).toEqual(전부);
  });

  it.each([
    ['모르는 칸', { ...좋은진척, extra: 1 }],
    ['음수', { ...좋은진척, tokens: -1 }],
    ['소수', { ...좋은진척, elapsedSec: 1.5 }],
    ['틀린 타입', { ...좋은진척, childRunning: 'true' }],
    ['빠진 칸', { childRunning: true }],
    ['긴 lastAction', { ...좋은진척, lastAction: 'a'.repeat(161) }],
    ['빈 lastAction', { ...좋은진척, lastAction: '' }],
    ['시각 아님', { ...좋은진척, lastActionAt: '어제' }],
    ['배열', []],
    ['null', null],
  ])('%s 는 거절한다', (_이름, 값) => {
    expect(진척검사(값)).toBeNull();
  });
});

describe('등급과 경계', () => {
  it('stop·discard 는 operator · 번호로 서비스를 찾는다 · 토큰 통로에 없다', () => {
    for (const 끝 of ['stop', 'discard']) {
      expect(등급표[`POST /api/authoring/requests/:id/${끝}`]).toBe('operator');
      expect(라우트표[`/api/authoring/requests/:id/${끝}`]).toEqual({ 종류: '작성요청', 칸: 'id' });
      expect(토큰통로.has(`POST /api/authoring/requests/:id/${끝}`)).toBe(false);
    }
  });
});

describe.skipIf(연결 === undefined)('중단 · 폐기 · 진척 통로', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 부르는이 = 사람1;
  let 역할: 'operator' | 'admin' = 'operator';

  const 넣기 = async (칸: { status: string; kind?: string; by?: string; sql?: string }): Promise<number> => {
    const { pool } = await import('../db/index.js');
    const 원본 = 칸.kind === undefined || 칸.kind === 'AUTHOR' ? null : await 넣기({ status: 'DONE' });
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, source_id, requested_by, requested_by_name, status, claimed_by, started_at)
       VALUES ($1, $2, $3, $4, '요청자', $5, $6, now()) RETURNING id`,
      [서비스, 칸.kind ?? 'AUTHOR', 원본, 칸.by ?? 사람1, 칸.status, 맥],
    );
    const id = Number(r.rows[0]!.id);
    if (칸.sql !== undefined) await pool.query(`UPDATE authoring_request SET ${칸.sql} WHERE id = $1`, [id]);
    return id;
  };
  const 읽기 = async (id: number) => {
    const { pool } = await import('../db/index.js');
    return (await pool.query('SELECT * FROM authoring_request WHERE id = $1', [id])).rows[0];
  };
  const 부르기 = (method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object) =>
    app.inject({ method, url, ...(payload === undefined ? {} : { payload }) });
  const 멈추기 = (id: number) => 부르기('POST', `/api/authoring/requests/${id}/stop`);
  const 버리기 = (id: number) => 부르기('POST', `/api/authoring/requests/${id}/discard`);
  const 도는중 = `progress = '{"childRunning": true}', stage_at = now()`;

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, 'XWT 중단 검사용', '#3A5FCD', 'https://github.com/acme/xwt', 'xwt')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사],
    );
    서비스 = Number(r.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query(
      `INSERT INTO app_user (username, display_name, password_hash) VALUES ($1, '첫째 사람', 'x')
       ON CONFLICT (username) DO NOTHING`,
      [사람1],
    );
    process.env.AUTHORING_AGENT_USER = 맥;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 부르는이, displayName: 부르는이, role: 역할, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(authoringAssetRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await pool.query('DELETE FROM app_user WHERE username = $1', [사람1]);
    await app.close();
  });

  const 사람으로 = (이름: string, 등급: 'operator' | 'admin' = 'operator') => {
    부르는이 = 이름;
    역할 = 등급;
  };

  it('대기 중이면 곧장 STOPPED · USER · 누른 사람', async () => {
    사람으로(사람1);
    const id = await 넣기({ status: 'PENDING' });
    const res = await 멈추기(id);
    expect(res.json()).toEqual({ status: 'STOPPED' });
    const 행 = await 읽기(id);
    expect([행.stop_reason, 행.stopped_by, 행.stop_requested_by]).toEqual(['USER', 사람1, 사람1]);
    expect(행.finished_at).not.toBeNull();
  });

  it('자식이 도는 중이면 요청만 적고 처음 누른 사람을 지킨다', async () => {
    사람으로(사람1);
    const id = await 넣기({ status: 'RUNNING', sql: 도는중 });
    expect((await 멈추기(id)).json()).toEqual({ status: 'RUNNING' });
    사람으로('xwt-관리자', 'admin');
    expect((await 멈추기(id)).statusCode).toBe(200);
    const 행 = await 읽기(id);
    expect([행.status, 행.stop_requested_by, 행.stopped_by]).toEqual(['RUNNING', 사람1, null]);
  });

  it('신호가 3분 넘게 없으면 곧장 AGENT_LOST', async () => {
    사람으로(사람1);
    const id = await 넣기({ status: 'RUNNING', sql: `stage_at = now() - interval '5 minutes'` });
    expect((await 멈추기(id)).json()).toEqual({ status: 'STOPPED' });
    expect((await 읽기(id)).stop_reason).toBe('AGENT_LOST');
  });

  it('올리는 중·머지는 NOT_STOPPABLE · 끝난 것·폐기된 것은 NOT_RUNNING', async () => {
    사람으로(사람1);
    const 올림 = await 넣기({ status: 'RUNNING', sql: `progress = '{"childRunning": false}', stage_at = now()` });
    expect((await 멈추기(올림)).json()).toEqual({ error: 'NOT_STOPPABLE' });
    const 머지 = await 넣기({ status: 'PENDING', kind: 'MERGE' });
    expect((await 멈추기(머지)).json()).toEqual({ error: 'NOT_STOPPABLE' });
    expect((await 멈추기(await 넣기({ status: 'DONE' }))).json()).toEqual({ error: 'NOT_RUNNING' });
    const 폐기 = await 넣기({ status: 'PENDING', sql: 'discarded_at = now()' });
    expect((await 멈추기(폐기)).statusCode).toBe(409);
  });

  it('남은 403 NOT_REQUESTER · admin 은 남의 것도', async () => {
    const id = await 넣기({ status: 'PENDING' });
    사람으로('xwt2');
    expect((await 멈추기(id)).json()).toEqual({ error: 'NOT_REQUESTER' });
    expect((await 버리기(id)).statusCode).toBe(403);
    사람으로('xwt-관리자', 'admin');
    expect((await 멈추기(id)).statusCode).toBe(200);
    expect((await 버리기(id)).statusCode).toBe(200);
  });

  it('폐기는 FAILED·STOPPED·DRAFT 만 · 두 번은 409', async () => {
    사람으로(사람1);
    for (const status of ['FAILED', 'DRAFT']) {
      expect((await 버리기(await 넣기({ status }))).json()).toEqual({ ok: true });
    }
    for (const status of ['DONE', 'RUNNING', 'PENDING']) {
      expect((await 버리기(await 넣기({ status }))).json()).toEqual({ error: 'NOT_DISCARDABLE' });
    }
    const 실패 = await 넣기({ status: 'FAILED' });
    await 버리기(실패);
    expect((await 버리기(실패)).statusCode).toBe(409);
  });

  it('목록은 폐기한 것을 빼고 ?discarded=1 은 그것만 · ?status=STOPPED', async () => {
    사람으로(사람1);
    const 폐기 = await 넣기({ status: 'FAILED', sql: 'discarded_at = now()' });
    const 멈춤 = await 넣기({ status: 'PENDING' });
    await 멈추기(멈춤);
    const 기본 = (await 부르기('GET', `/api/authoring/requests?service=${접두사}`)).json();
    expect(기본.items.map((i: { id: number }) => i.id)).not.toContain(폐기);
    const 버린것 = (await 부르기('GET', `/api/authoring/requests?service=${접두사}&discarded=1`)).json();
    expect(버린것.items.every((i: { discardedAt: string | null }) => i.discardedAt !== null)).toBe(true);
    expect(버린것.items.map((i: { id: number }) => i.id)).toContain(폐기);
    const 멈춘것 = (await 부르기('GET', `/api/authoring/requests?service=${접두사}&status=STOPPED`)).json();
    const 줄 = 멈춘것.items.find((i: { id: number }) => i.id === 멈춤);
    expect(줄).toMatchObject({ status: 'STOPPED', stopReason: 'USER', discardedAt: null });
    expect(typeof 줄.stopRequestedAt).toBe('string');
  });

  it('상세에 진척·중단 칸과 부른 사람 기준 버튼', async () => {
    사람으로(사람1);
    const 도는것 = await 넣기({ status: 'RUNNING', sql: `progress = '{"childRunning": true, "tokens": 3}', stage_at = now()` });
    const 상세 = (await 부르기('GET', `/api/authoring/requests/${도는것}`)).json();
    expect(상세).toMatchObject({
      progress: { childRunning: true, tokens: 3 },
      stopReason: null,
      stoppedBy: null,
      stoppedByName: null,
      stopRequestedAt: null,
      discardedAt: null,
      canStop: true,
      canDiscard: false,
    });
    await 멈추기(도는것);
    expect((await 부르기('GET', `/api/authoring/requests/${도는것}`)).json().canStop).toBe(false);

    const 멈춤 = await 넣기({ status: 'PENDING' });
    await 멈추기(멈춤);
    expect((await 부르기('GET', `/api/authoring/requests/${멈춤}`)).json()).toMatchObject({
      stoppedBy: 사람1,
      stoppedByName: '첫째 사람',
      canStop: false,
      canDiscard: true,
    });
    사람으로('xwt2');
    expect((await 부르기('GET', `/api/authoring/requests/${멈춤}`)).json().canDiscard).toBe(false);
    const 시스템 = await 넣기({ status: 'FAILED', sql: `status = 'STOPPED', stop_reason = 'TIMEOUT', stopped_by = 'system'` });
    expect((await 부르기('GET', `/api/authoring/requests/${시스템}`)).json().stoppedByName).toBeNull();
    const 모름 = await 넣기({ status: 'FAILED', sql: `status = 'STOPPED', stop_reason = 'USER', stopped_by = 'xwt-없는이'` });
    expect((await 부르기('GET', `/api/authoring/requests/${모름}`)).json().stoppedByName).toBe('xwt-없는이');
  });

  it('폐기한 초안은 자료 올리기·제출 409 · 폐기한 원본으로 재실행 BAD_SOURCE', async () => {
    사람으로(사람1);
    const 초안 = await 넣기({ status: 'DRAFT', sql: 'discarded_at = now()' });
    const 올림 = await app.inject({
      method: 'POST',
      url: `/api/authoring/requests/${초안}/assets?name=a.md`,
      headers: { 'content-type': 'application/octet-stream' },
      payload: Buffer.from('# 기획서'),
    });
    expect(올림.statusCode).toBe(409);
    expect((await 부르기('POST', `/api/authoring/requests/${초안}/submit`)).statusCode).toBe(409);
    const 원본 = await 넣기({ status: 'FAILED', sql: 'discarded_at = now()' });
    const 재실행 = await 부르기('POST', `/api/authoring/requests?service=${접두사}`, { kind: 'RERUN', sourceId: 원본 });
    expect(재실행.statusCode).toBe(409);
    expect(재실행.json().error).toBe('BAD_SOURCE');
  });

  it('stage 는 진척을 싣고 멈춤 요청이 있으면 stop 을 돌려준다', async () => {
    사람으로(사람1);
    const id = await 넣기({ status: 'RUNNING', sql: `stage_at = now() - interval '1 minute'` });
    const 단계 = (진척?: unknown) => {
      사람으로(맥);
      return 부르기('PATCH', `/api/authoring/requests/${id}/stage`, { stage: '케이스를 만드는 중', ...(진척 === undefined ? {} : { progress: 진척 }) });
    };
    expect((await 단계(좋은진척)).json()).toEqual({ ok: true, stop: false });
    expect((await 읽기(id)).progress).toEqual(좋은진척);
    사람으로(사람1);
    await 멈추기(id);
    expect((await 단계(좋은진척)).json()).toEqual({ ok: true, stop: true });
    expect((await 단계({ ...좋은진척, tokens: -1 })).json()).toEqual({ error: 'BAD_PROGRESS' });
    expect((await 단계()).json()).toEqual({ ok: true, stop: false });
    const 행 = await 읽기(id);
    expect(행.progress).toEqual({ ...좋은진척, childRunning: false });
    expect(Date.now() - new Date(행.stage_at).getTime()).toBeLessThan(30_000);
  });

  it('finish STOPPED — USER 는 요청한 사람 · 그 밖은 system · 틀리면 BAD_STOP', async () => {
    const 끝 = (id: number, 본문: object) => {
      사람으로(맥);
      return 부르기('POST', `/api/authoring/requests/${id}/finish`, 본문);
    };
    const 요청됨 = await 넣기({ status: 'RUNNING', sql: `stop_requested_at = now(), stop_requested_by = '${사람1}'` });
    expect((await 끝(요청됨, { status: 'STOPPED', stopReason: 'USER' })).json()).toEqual({ ok: true });
    expect(await 읽기(요청됨)).toMatchObject({ status: 'STOPPED', stop_reason: 'USER', stopped_by: 사람1 });

    const 시간 = await 넣기({ status: 'RUNNING' });
    expect((await 끝(시간, { status: 'STOPPED', stopReason: 'TIMEOUT' })).statusCode).toBe(200);
    expect(await 읽기(시간)).toMatchObject({ stop_reason: 'TIMEOUT', stopped_by: 'system' });

    const 틀림 = await 넣기({ status: 'RUNNING' });
    for (const 본문 of [
      { status: 'STOPPED', stopReason: 'USER' },
      { status: 'STOPPED', stopReason: 'AGENT_LOST' },
      { status: 'STOPPED' },
      { status: 'DONE', stopReason: 'TIMEOUT' },
      { status: 'FAILED', stopReason: 'LIMIT' },
    ]) {
      expect((await 끝(틀림, 본문)).json()).toEqual({ error: 'BAD_STOP' });
    }
  });
});
