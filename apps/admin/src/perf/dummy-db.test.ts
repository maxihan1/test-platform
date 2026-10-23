// 더미 클라이언트 올리기 · 목록 · 지우기 · 에이전트 받기와 더미 클라이언트 실행 만들기 · 일 나누기를 실제 DB 와 문으로 본다 (도메인/성능 §3.9 · §5.4 · §7)

import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 도는실행들, 한번돌기 } from './engine.js';
import { 차리기, type 차림 } from './dbFixture.js';
import { emptyHist } from './hist.js';
import { 도는것, type 도는실행 } from './state.js';

const 연결 = process.env.DATABASE_URL;
const 에이전트이름 = ['xqm-a', 'xqm-b'];
const ZIP = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('가짜 더미 클라이언트 내용')]);

describe.skipIf(연결 === undefined)('더미 클라이언트', { timeout: 60_000 }, () => {
  let 틀: 차림;
  let 폴더 = '';
  const 이전폴더 = process.env.PLATFORM_ARTIFACTS_DIR;
  const 토큰: Record<string, string> = {};
  const 번호: Record<string, number> = {};

  const 올리기 = (cookie: string, payload: Buffer, query = 'name=봇&command=./bot', headers: Record<string, string> = {}) =>
    틀.app.inject({ method: 'POST', url: `/api/perf/dummy-clients?serviceId=${틀.서비스}&${query}`, headers: { cookie, 'content-type': 'application/zip', ...headers }, payload });
  const 에이전트 = (이름: string, url: string, payload: object = {}) =>
    틀.app.inject({ method: 'POST', url, headers: { authorization: `Bearer ${토큰[이름]}` }, payload });
  const 일받기 = async (이름: string) => {
    for (let i = 0; i < 100; i++) {
      await 한번돌기();
      const job = (await 에이전트(이름, '/api/perf/agent/claim')).json<{ job: Record<string, unknown> | null }>().job;
      if (job !== null) return job;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error('일이 오지 않았다');
  };
  const 실행 = (scenarioId: number, more: object = {}) =>
    틀.사람(틀.관리자, 'POST', '/api/perf/runs', {
      scenarioId, env: 'qa', testType: 'LOAD', stages: [{ durationSec: 30, target: 2 }], targets: [], agentIds: [번호['xqm-a']], ...more,
    });

  beforeAll(async () => {
    폴더 = mkdtempSync(join(tmpdir(), 'xqm-artifacts-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 폴더;
    틀 = await 차리기('XQM');
    for (const [이름, maxVus] of [['xqm-a', 3], ['xqm-b', 1]] as const) {
      const 발급 = (await 틀.사람(틀.관리자, 'POST', '/api/perf/agents', { name: 이름, mode: 'LOAD' })).json<{ id: number; token: string }>();
      번호[이름] = 발급.id;
      토큰[이름] = 발급.token;
      await 에이전트(이름, '/api/perf/agent/hello', { version: '0.1.0', host: 이름, maxVus });
    }
  });

  afterAll(async () => {
    for (const id of 도는실행들().keys()) await 틀.사람(틀.관리자, 'POST', `/api/perf/runs/${id}/stop`);
    await 틀.pool.query('DELETE FROM perf_agent WHERE name = ANY($1)', [에이전트이름]);
    await 틀.정리();
    if (이전폴더 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
    else process.env.PLATFORM_ARTIFACTS_DIR = 이전폴더;
    rmSync(폴더, { recursive: true, force: true });
  });

  it('admin 이 zip 을 올리면 201 · 파일이 artifacts/perf-dummy/<번호>.zip 에 놓이고 목록에 뜬다', async () => {
    const res = await 올리기(틀.관리자, ZIP);
    expect(res.statusCode).toBe(201);
    const { id } = res.json<{ id: number }>();
    expect(readFileSync(join(폴더, 'perf-dummy', `${id}.zip`)).equals(ZIP)).toBe(true);
    const 목록 = (await 틀.사람(틀.읽기만, 'GET', `/api/perf/dummy-clients?serviceId=${틀.서비스}`)).json<{ clients: { id: number; name: string; command: string; bytes: number }[] }>().clients;
    expect(목록).toEqual([expect.objectContaining({ id, name: '봇', command: './bot', bytes: ZIP.length })]);
    await 틀.사람(틀.관리자, 'DELETE', `/api/perf/dummy-clients/${id}`);
  });

  // 러너도 쓰는 artifacts 볼륨에 두면 케이스가 zip 을 바꿔치기하고 에이전트가 그 코드를 root 로 돌린다 (리뷰 M16)
  it('PLATFORM_PERF_DUMMY_DIR 가 있으면 zip 은 artifacts 가 아니라 그 자리에 놓이고 지우기도 거기서 한다', async () => {
    const 따로 = mkdtempSync(join(tmpdir(), 'xqm-dummy-'));
    process.env.PLATFORM_PERF_DUMMY_DIR = 따로;
    try {
      const { id } = (await 올리기(틀.관리자, ZIP)).json<{ id: number }>();
      expect(readFileSync(join(따로, `${id}.zip`)).equals(ZIP)).toBe(true);
      expect(existsSync(join(폴더, 'perf-dummy', `${id}.zip`))).toBe(false);
      expect((await 틀.사람(틀.관리자, 'DELETE', `/api/perf/dummy-clients/${id}`)).statusCode).toBe(204);
      expect(existsSync(join(따로, `${id}.zip`))).toBe(false);
    } finally {
      delete process.env.PLATFORM_PERF_DUMMY_DIR;
      rmSync(따로, { recursive: true, force: true });
    }
  });

  it('admin 이 아니면 403 · zip 머리가 아니면 400 · 이름 · 명령이 틀리면 400 이고 행도 파일도 남지 않는다', async () => {
    expect((await 올리기(틀.쓰기, ZIP)).statusCode).toBe(403);
    expect((await 올리기(틀.관리자, Buffer.from('zip 이 아닌 글'))).json()).toMatchObject({ error: 'INVALID_REQUEST' });
    expect((await 올리기(틀.관리자, Buffer.from('PK'))).statusCode).toBe(400);
    expect((await 올리기(틀.관리자, ZIP, 'name=%20&command=./bot')).statusCode).toBe(400);
    expect((await 올리기(틀.관리자, ZIP, `name=${'a'.repeat(41)}&command=./bot`)).statusCode).toBe(400);
    expect((await 올리기(틀.관리자, ZIP, `name=봇&command=${'a'.repeat(501)}`)).statusCode).toBe(400);
    const 개수 = await 틀.pool.query('SELECT 1 FROM perf_dummy_client WHERE service_id = $1', [틀.서비스]);
    expect(개수.rowCount).toBe(0);
    expect(existsSync(join(폴더, 'perf-dummy')) ? readdirSync(join(폴더, 'perf-dummy')) : []).toEqual([]);
  });

  it('보낸다고 밝힌 크기가 200MB 를 넘으면 읽지 않고 413 PAYLOAD_TOO_LARGE 다', async () => {
    const res = await 올리기(틀.관리자, ZIP, 'name=봇&command=./bot', { 'content-length': String(201 * 1024 * 1024) });
    expect(res.statusCode).toBe(413);
    expect(res.json()).toEqual({ error: 'PAYLOAD_TOO_LARGE' });
  });

  it('쓰는 시나리오가 있으면 지우기는 409 IN_USE, 없으면 204 로 파일까지 지운다', async () => {
    const { id } = (await 올리기(틀.관리자, ZIP)).json<{ id: number }>();
    const 시나리오 = await 틀.시나리오만들기('봇 시나리오', { dummyClient: id });
    expect((await 틀.사람(틀.읽기만, 'DELETE', `/api/perf/dummy-clients/${id}`)).statusCode).toBe(403);
    expect((await 틀.사람(틀.관리자, 'DELETE', `/api/perf/dummy-clients/${id}`)).json()).toEqual({ error: 'IN_USE' });
    await 틀.사람(틀.관리자, 'DELETE', `/api/perf/scenarios/${시나리오}`);
    expect((await 틀.사람(틀.관리자, 'DELETE', `/api/perf/dummy-clients/${id}`)).statusCode).toBe(204);
    expect(existsSync(join(폴더, 'perf-dummy', `${id}.zip`))).toBe(false);
    expect((await 틀.사람(틀.관리자, 'DELETE', `/api/perf/dummy-clients/${id}`)).statusCode).toBe(404);
  });

  it('에이전트는 자기가 맡은 도는 실행의 더미 클라이언트만 받는다', async () => {
    const { id } = (await 올리기(틀.관리자, ZIP)).json<{ id: number }>();
    const 받기 = (이름: string) => 틀.app.inject({ method: 'GET', url: `/api/perf/agent/dummy-clients/${id}`, headers: { authorization: `Bearer ${토큰[이름]}` } });
    expect((await 받기('xqm-a')).statusCode).toBe(404);
    const live = { runId: 987_654_321, kind: 'LOAD', phase: 'SMOKE', startAt: Date.now(), durationSec: 60, dummyClient: id, agents: [번호['xqm-a']], monitors: [] } as unknown as 도는실행;
    도는것.set(live.runId, live);
    try {
      const 맡음 = await 받기('xqm-a');
      expect(맡음.statusCode).toBe(200);
      expect(맡음.headers['content-type']).toBe('application/zip');
      expect(맡음.rawPayload.equals(ZIP)).toBe(true);
      expect((await 받기('xqm-b')).statusCode).toBe(404);
      expect((await 틀.사람(틀.관리자, 'GET', `/api/perf/agent/dummy-clients/${id}`)).statusCode).toBe(401);
    } finally {
      도는것.delete(live.runId);
    }
    await 틀.사람(틀.관리자, 'DELETE', `/api/perf/dummy-clients/${id}`);
  });

  it('더미 클라이언트 시나리오는 동시 사용자 기준만 받고 부하 중 페이지 측정은 400 이다', async () => {
    const { id } = (await 올리기(틀.관리자, ZIP)).json<{ id: number }>();
    const 시나리오 = await 틀.시나리오만들기('봇 거절', { dummyClient: id });
    const tps = await 실행(시나리오, { basis: 'TPS' });
    expect(tps.statusCode).toBe(400);
    expect(tps.json()).toMatchObject({ error: 'INVALID_REQUEST', detail: '더미 클라이언트는 동시 사용자 기준만 받습니다' });
    expect((await 실행(시나리오, { pageCheck: true })).statusCode).toBe(400);
    await 틀.사람(틀.관리자, 'DELETE', `/api/perf/scenarios/${시나리오}`);
    await 틀.사람(틀.관리자, 'DELETE', `/api/perf/dummy-clients/${id}`);
  });

  it('스모크는 첫 에이전트 1명 · 60초, 본 테스트는 최대 동시 사용자를 에이전트 비율로 나눠 합이 같고 몫 0 도 일을 받는다', async () => {
    const { id } = (await 올리기(틀.관리자, ZIP, 'name=봇&command=./bot%20--users%20$QAHUB_USERS')).json<{ id: number }>();
    await 틀.pool.query(`INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'ws', 'https://game.xqm.test:7443')`, [틀.서비스]);
    const 시나리오 = await 틀.시나리오만들기('봇 실행', { dummyClient: id });
    const a = 번호['xqm-a'] as number;
    const b = 번호['xqm-b'] as number;
    const 만듦 = await 실행(시나리오, { env: 'ws', agentIds: [a, b], stages: [{ durationSec: 10, target: 1 }, { durationSec: 20, target: 2 }] });
    expect(만듦.statusCode).toBe(201);
    const runId = 만듦.json<{ runId: number }>().runId;

    const 스모크 = await 일받기('xqm-a');
    expect(스모크).toMatchObject({
      kind: 'SMOKE', script: null, durationSec: 60, dummyClient: { id, command: './bot --users $QAHUB_USERS', users: 1 },
      env: { QAHUB_HOST: 'game.xqm.test', QAHUB_PORT: '7443', QAHUB_USERS: '1', QAHUB_DURATION_SEC: '60', QAHUB_STAGES: '[{"durationSec":1,"target":1},{"durationSec":59,"target":1}]', BASE_URL: 'https://game.xqm.test:7443' },
    });
    const 초 = { sec: 0, vus: 1, txs: [{ name: '로그인', requests: 3, errors: 0, hist: emptyHist() }] };
    await 에이전트('xqm-a', `/api/perf/agent/runs/${runId}/metrics`, 초);
    await 에이전트('xqm-a', `/api/perf/agent/runs/${runId}/done`, { status: 'OK' });

    const 본a = await 일받기('xqm-a');
    const 본b = await 일받기('xqm-b');
    expect(본a).toMatchObject({ kind: 'LOAD', script: null, durationSec: 30, dummyClient: { id, users: 2 }, env: { QAHUB_USERS: '2', QAHUB_STAGES: '[{"durationSec":10,"target":1},{"durationSec":20,"target":2}]' } });
    expect(본b).toMatchObject({ kind: 'LOAD', script: null, durationSec: 30, dummyClient: { id, users: 0 }, env: { QAHUB_USERS: '0', QAHUB_PORT: '7443' } });
    expect(본b.env).toMatchObject({ QAHUB_STAGES: '[{"durationSec":10,"target":0},{"durationSec":20,"target":0}]' });

    await 틀.사람(틀.관리자, 'POST', `/api/perf/runs/${runId}/stop`);
  });
});
