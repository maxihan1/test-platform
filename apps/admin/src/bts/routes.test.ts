// 설정 › BTS 연결 통로 — 읽기 · 저장(BTS 확인) · 끊기 · 열쇠 만들기 · 코드 저장소 칸 (도메인/BTS §7). DATABASE_URL 이 있을 때만 돈다

import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 토큰해시 } from '../auth/agentToken.js';
import settingsRoutes from '../settings/routes.js';

import { BTS확인 } from './link.js';
import btsLinkRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XBL';

const 상태 = { DEPLOY_WAIT: '배포 대기', QA_REQUEST: 'QA 요청', QA_REVIEW: 'QA 검토', DEV_REQUEST: '개발 요청', CODE_REVIEW: '코드 리뷰', CLOSED: '닫힘' };
const 해결 = { SCREEN_RIGHT: '화면이 맞음', TEST_PROBLEM: '테스트 문제', FLAKY: '흔들림', ENV: '환경 문제', DUPLICATE: '중복' };

describe('BTS 확인 — 가짜 BTS', () => {
  let 서버: Server;
  let 주소 = '';
  const 받은것: { url?: string; auth?: string }[] = [];

  beforeAll(async () => {
    서버 = createServer((req, res) => {
      받은것.push({ url: req.url, auth: req.headers.authorization });
      res.statusCode = req.headers.authorization === 'Bearer pat_good' && req.url === '/api/v1/projects/DM' ? 200 : 404;
      res.end('{}');
    });
    await new Promise<void>((r) => 서버.listen(0, '127.0.0.1', r));
    주소 = `http://127.0.0.1:${(서버.address() as AddressInfo).port}`;
  });

  afterAll(() => new Promise<void>((r) => 서버.close(() => r())));

  it('그 열쇠로 그 프로젝트를 읽을 수 있을 때만 true 다', async () => {
    expect(await BTS확인(`${주소}/`, 'DM', 'pat_good')).toBe(true);
    expect(받은것.at(-1)).toEqual({ url: '/api/v1/projects/DM', auth: 'Bearer pat_good' });
    expect(await BTS확인(주소, 'DM', 'pat_bad')).toBe(false);
    expect(await BTS확인(주소, 'XX', 'pat_good')).toBe(false);
  });

  it('닿지 않는 주소는 false 다', async () => {
    expect(await BTS확인('http://127.0.0.1:1', 'DM', 'pat_good')).toBe(false);
  });
});

describe.skipIf(연결 === undefined)('설정 API — BTS 연결', () => {
  let app: FastifyInstance;
  let 프로젝트 = 0;
  let 서비스 = 0;
  const 확인한것: [string, string, string][] = [];
  let 확인결과 = true;
  const 부른것: [string, string][] = [];
  let 목록답 = 200;

  const pool = async () => (await import('../db/index.js')).pool;
  const 주소 = () => `/api/settings/projects/${프로젝트}/bts`;
  const 본문 = (덧붙임: Record<string, unknown> = {}) => ({
    baseUrl: 'https://bts.example.com',
    btsProject: 'DM',
    statusMap: 상태,
    resolutionMap: 해결,
    ...덧붙임,
  });
  const 저장 = (payload: Record<string, unknown>) => app.inject({ method: 'PUT', url: 주소(), payload });
  const 읽기 = async () => (await app.inject({ method: 'GET', url: 주소() })).json<Record<string, unknown>>();

  beforeAll(async () => {
    app = Fastify();
    await app.register(settingsRoutes, { prefix: '/api' });
    await app.register(btsLinkRoutes, {
      prefix: '/api',
      확인: async (baseUrl, btsProject, botKey) => {
        확인한것.push([baseUrl, btsProject, botKey]);
        return 확인결과;
      },
      부르기: async (자리, _method, 경로) => {
        부른것.push([자리.botKey, 경로]);
        const data = 경로 === '/api/v1/statuses' ? [{ id: 1, key: 'qa-review', name: 'QA Review' }, { key: 7 }] : [{ id: 2, key: 'wontfix', name: "Won't Fix" }];
        return { status: 목록답, json: { data } };
      },
    });
    await app.ready();
    const p = await pool();
    프로젝트 = Number((await p.query<{ id: string }>(`INSERT INTO project (name) VALUES ('${접두사} 프로젝트') RETURNING id`)).rows[0]!.id);
    서비스 = Number(
      (
        await p.query<{ id: string }>(
          `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1, '#112233', '', 'xbl', $2) RETURNING id`,
          [접두사, 프로젝트],
        )
      ).rows[0]!.id,
    );
  });

  afterAll(async () => {
    const p = await pool();
    // service 를 지우면 빈 프로젝트는 트리거가 지우고 bts_link 는 프로젝트와 같이 지워진다
    await p.query('DELETE FROM service WHERE id = $1', [서비스]);
    await p.query('DELETE FROM project WHERE id = $1', [프로젝트]);
    await app.close();
  });

  it('연결 전에는 linked: false 이고 없는 프로젝트는 404 다', async () => {
    expect(await 읽기()).toEqual({
      linked: false, baseUrl: null, btsProject: null, botKeyTail: null, statusMap: {}, resolutionMap: {}, deployKey: null, ruleToken: null, publicUrl: null,
    });
    const 없음 = await app.inject({ method: 'GET', url: '/api/settings/projects/999999999/bts' });
    expect(없음.statusCode).toBe(404);
  });

  it('처음 연결은 「QA Hub AI」 열쇠를 꼭 받는다 · 짝이 빈 단계가 있으면 MAP_INCOMPLETE', async () => {
    const 열쇠없음 = await 저장(본문({ webhookSecret: 'sec' }));
    expect([열쇠없음.statusCode, 열쇠없음.json().error]).toEqual([400, 'SECRETS_REQUIRED']);
    const 빈짝 = await 저장(본문({ botKey: 'pat_abcd1234', webhookSecret: 'sec', statusMap: { ...상태, QA_REVIEW: ' ' } }));
    expect([빈짝.statusCode, 빈짝.json().error]).toEqual([400, 'MAP_INCOMPLETE']);
    const { CLOSED: _, ...빠짐 } = 상태;
    const 단계빠짐 = await 저장(본문({ botKey: 'pat_abcd1234', webhookSecret: 'sec', statusMap: 빠짐 }));
    expect([단계빠짐.statusCode, 단계빠짐.json().error]).toEqual([400, 'MAP_INCOMPLETE']);
    const 모르는단계 = await 저장(본문({ botKey: 'pat_abcd1234', webhookSecret: 'sec', statusMap: { ...상태, OTHER: 'x' } }));
    expect([모르는단계.statusCode, 모르는단계.json().error]).toEqual([400, 'INVALID_REQUEST']);
  });

  it('고를 목록 — 적은 열쇠로 BTS 상태 키 · 이름과 해결 사유 이름을 읽는다 · 꼴이 틀린 줄은 뺀다', async () => {
    const 목록 = (payload: Record<string, unknown>) => app.inject({ method: 'POST', url: `${주소()}/choices`, payload });
    const res = await 목록({ baseUrl: 'https://bts.example.com/', botKey: 'pat_try1' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ statuses: [{ key: 'qa-review', name: 'QA Review' }], resolutions: [{ name: "Won't Fix" }] });
    expect(부른것.slice(-2).map(([열쇠]) => 열쇠)).toEqual(['pat_try1', 'pat_try1']);
    const 열쇠없음 = await 목록({ baseUrl: 'https://bts.example.com' });
    expect([열쇠없음.statusCode, 열쇠없음.json().error]).toEqual([400, 'BOT_KEY_REQUIRED']);
    목록답 = 403;
    const 거절 = await 목록({ baseUrl: 'https://bts.example.com', botKey: 'pat_try1' });
    목록답 = 200;
    expect([거절.statusCode, 거절.json().error]).toEqual([400, 'BTS_UNREACHABLE']);
  });

  it('BTS 확인이 실패하면 저장하지 않는다', async () => {
    확인결과 = false;
    const res = await 저장(본문({ botKey: 'pat_abcd1234', webhookSecret: 'sec' }));
    확인결과 = true;
    expect([res.statusCode, res.json().error]).toEqual([400, 'BTS_UNREACHABLE']);
    expect((await 읽기()).linked).toBe(false);
  });

  it('저장하면 열쇠는 끝 4자리만 읽힌다 · 고칠 때 비운 열쇠는 그대로 쓴다', async () => {
    expect((await 저장(본문({ botKey: 'pat_abcd1234', webhookSecret: 'sec' }))).statusCode).toBe(200);
    expect(확인한것.at(-1)).toEqual(['https://bts.example.com', 'DM', 'pat_abcd1234']);
    expect(await 읽기()).toMatchObject({ linked: true, baseUrl: 'https://bts.example.com', btsProject: 'DM', botKeyTail: '1234', statusMap: 상태, resolutionMap: 해결 });
    expect(JSON.stringify(await 읽기())).not.toContain('pat_abcd1234');

    expect((await 저장(본문({ btsProject: 'DM2' }))).statusCode).toBe(200);
    expect(확인한것.at(-1)).toEqual(['https://bts.example.com', 'DM2', 'pat_abcd1234']);
    const p = await pool();
    const 행 = (await p.query('SELECT bot_key, webhook_secret FROM bts_link WHERE project_id = $1', [프로젝트])).rows[0];
    expect(행).toEqual({ bot_key: 'pat_abcd1234', webhook_secret: 'sec' });

    // 열쇠를 다시 안 적으면 같은 주소에 저장한 열쇠로 고를 목록을 읽는다 — 다른 주소면 열쇠를 다시 받는다
    expect((await app.inject({ method: 'POST', url: `${주소()}/choices`, payload: { baseUrl: 'https://bts.example.com' } })).statusCode).toBe(200);
    expect(부른것.at(-1)?.[0]).toBe('pat_abcd1234');
    const 딴주소 = await app.inject({ method: 'POST', url: `${주소()}/choices`, payload: { baseUrl: 'https://other.example.com' } });
    expect(딴주소.json().error).toBe('BOT_KEY_REQUIRED');
  });

  it('끝 「/」 · 대문자 호스트만 다른 주소는 같은 주소로 친다 · 물음표 붙은 주소는 받지 않는다', async () => {
    expect((await 저장(본문({ baseUrl: 'https://BTS.example.com/', btsProject: 'DM2' }))).statusCode).toBe(200);
    expect((await 읽기()).baseUrl).toBe('https://bts.example.com');
    expect((await 저장(본문({ baseUrl: 'https://bts.example.com/?x=1', botKey: 'pat_abcd1234' }))).statusCode).toBe(400);
  });

  it('주소를 바꾸면 「QA Hub AI」 열쇠를 다시 받는다', async () => {
    const res = await 저장(본문({ baseUrl: 'https://other.example.com' }));
    expect([res.statusCode, res.json().error]).toEqual([400, 'BOT_KEY_REQUIRED']);
    expect((await 저장(본문({ baseUrl: 'https://other.example.com', botKey: 'pat_new9876' }))).statusCode).toBe(200);
    expect((await 읽기()).botKeyTail).toBe('9876');
  });

  it('열쇠를 만들면 원문은 그 응답 한 번뿐 · DB 엔 해시와 끝 4자리 · 새로 만들면 앞 열쇠가 끊긴다', async () => {
    const 첫 = await app.inject({ method: 'POST', url: `${주소()}/keys/deploy` });
    expect(첫.statusCode).toBe(201);
    const 첫열쇠 = 첫.json<{ key: string }>().key;
    expect(첫열쇠).toMatch(/^pdk_[A-Za-z0-9_-]{43}$/);
    const 규칙 = (await app.inject({ method: 'POST', url: `${주소()}/keys/rule` })).json<{ key: string }>().key;
    expect(규칙).toMatch(/^btr_/);

    const 보기 = await 읽기();
    expect(보기.deployKey).toMatchObject({ tail: 첫열쇠.slice(-4) });
    expect(보기.ruleToken).toMatchObject({ tail: 규칙.slice(-4) });
    expect(JSON.stringify(보기)).not.toContain(첫열쇠);

    const 둘째 = (await app.inject({ method: 'POST', url: `${주소()}/keys/deploy` })).json<{ key: string }>().key;
    const p = await pool();
    const 해시 = (await p.query('SELECT deploy_key_hash FROM bts_link WHERE project_id = $1', [프로젝트])).rows[0].deploy_key_hash;
    expect(해시).toBe(토큰해시(둘째));
    expect(해시).not.toBe(토큰해시(첫열쇠));

    const 틀린종류 = await app.inject({ method: 'POST', url: `${주소()}/keys/other` });
    expect(틀린종류.statusCode).toBe(400);
  });

  it('끊으면 다시 linked: false 이고 열쇠 만들기는 409 NOT_LINKED 다 · 없는 프로젝트는 둘 다 404', async () => {
    const 없는 = '/api/settings/projects/999999999/bts';
    expect((await app.inject({ method: 'DELETE', url: 없는 })).statusCode).toBe(404);
    expect((await app.inject({ method: 'POST', url: `${없는}/keys/deploy` })).statusCode).toBe(404);
    expect((await app.inject({ method: 'DELETE', url: 주소() })).statusCode).toBe(204);
    expect((await 읽기()).linked).toBe(false);
    const res = await app.inject({ method: 'POST', url: `${주소()}/keys/deploy` });
    expect([res.statusCode, res.json().error]).toEqual([409, 'NOT_LINKED']);
  });

  it('애플리케이션 코드 저장소 — 저장하고 목록에 실린다 · https 만 받는다 · 비울 수 있다', async () => {
    const 고치기 = (codeRepos: unknown[]) => app.inject({ method: 'PATCH', url: `/api/settings/services/${서비스}`, payload: { codeRepos } });
    const 목록 = async () =>
      (await app.inject({ method: 'GET', url: '/api/settings/services' }))
        .json<{ items: { id: number; codeRepos: unknown }[] }>()
        .items.find((s) => s.id === 서비스)?.codeRepos;

    expect(await 목록()).toEqual([]);
    const 줄 = [{ name: '화면', url: 'https://github.com/acme/web' }, { name: '서버', url: 'https://github.com/acme/api' }];
    expect((await 고치기(줄)).statusCode).toBe(200);
    expect(await 목록()).toEqual(줄);
    expect((await 고치기([{ name: '화면', url: 'git@github.com:acme/web.git' }])).statusCode).toBe(400);
    expect((await 고치기([{ name: '화면', url: 'http://github.com/acme/web' }])).statusCode).toBe(400);
    expect(await 목록()).toEqual(줄);
    expect((await app.inject({ method: 'PATCH', url: `/api/settings/services/${서비스}`, payload: { name: `${접두사} 새 이름` } })).statusCode).toBe(200);
    expect(await 목록()).toEqual(줄);
    expect((await 고치기([])).statusCode).toBe(200);
    expect(await 목록()).toEqual([]);
  });

  it('처음 연결에 알림 서명 비밀을 안 주면 QA Hub 가 만들어 둔다', async () => {
    expect((await 저장(본문({ botKey: 'pat_abcd1234' }))).statusCode).toBe(200);
    const p = await pool();
    const 비밀 = (await p.query<{ webhook_secret: string }>('SELECT webhook_secret FROM bts_link WHERE project_id = $1', [프로젝트])).rows[0]!.webhook_secret;
    expect(비밀).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});
