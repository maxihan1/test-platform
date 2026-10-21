// 설정 API 의 프로젝트 통로 — 목록 · 만들기 · 이름 바꾸기 · 애플리케이션 옮기기 · 만들기가 프로젝트를 꼭 받기 · me 에 프로젝트 싣기
// (SPEC 도메인/인증 §7). CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 사용자와해시 } from '../auth/store.js';
import settingsRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XPQS';
const 계정 = 'xpq-user';

describe.skipIf(연결 === undefined)('설정 API — 프로젝트', () => {
  let app: FastifyInstance;
  const 만든프로젝트: number[] = [];
  let 서비스번호 = 0;

  const pool = async () => (await import('../db/index.js')).pool;

  async function 프로젝트만들기(name: string) {
    const res = await app.inject({ method: 'POST', url: '/api/settings/projects', payload: { name } });
    if (res.statusCode === 201) 만든프로젝트.push(res.json<{ id: number }>().id);
    return res;
  }

  async function 서비스목록() {
    const res = await app.inject({ method: 'GET', url: '/api/settings/services' });
    return res.json<{ items: { id: number; prefix: string; projectId: number; projectName: string }[] }>().items;
  }

  const 서비스본문 = (projectId: unknown) => ({
    prefix: 접두사,
    name: `${접두사} 서비스`,
    color: '#112233',
    ...(projectId === undefined ? {} : { projectId }),
    testsRepo: '',
    testsDir: 'xpqs',
    envs: [{ env: 'qa', baseUrl: 'https://qa.example.com' }],
  });

  beforeAll(async () => {
    app = Fastify();
    await app.register(settingsRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    const p = await pool();
    await p.query('DELETE FROM user_project WHERE username = $1', [계정]);
    await p.query('DELETE FROM app_user WHERE username = $1', [계정]);
    await p.query('DELETE FROM service_env WHERE service_id IN (SELECT id FROM service WHERE prefix = $1)', [접두사]);
    await p.query('DELETE FROM service WHERE prefix = $1', [접두사]);
    await p.query('DELETE FROM project WHERE id = ANY($1::bigint[])', [만든프로젝트]);
    await app.close();
  });

  it('만들면 201 과 번호를 주고 목록에 이름이 뜬다. 앞뒤 공백은 뗀다', async () => {
    const res = await 프로젝트만들기('  XPQ 데모마켓  ');
    expect(res.statusCode).toBe(201);
    const { id } = res.json<{ id: number }>();
    const 목록 = await app.inject({ method: 'GET', url: '/api/settings/projects' });
    expect(목록.statusCode).toBe(200);
    expect(목록.json<{ items: { id: number; name: string }[] }>().items).toContainEqual({ id, name: 'XPQ 데모마켓' });
  });

  it('이름이 비었거나 공백뿐이면 400 이다', async () => {
    for (const 나쁜것 of ['', '   ']) {
      const res = await 프로젝트만들기(나쁜것);
      expect(res.statusCode, 나쁜것).toBe(400);
      expect(res.json<{ error: string }>().error).toBe('INVALID_REQUEST');
    }
    const 이름없음 = await app.inject({ method: 'POST', url: '/api/settings/projects', payload: {} });
    expect(이름없음.statusCode).toBe(400);
  });

  it('같은 이름의 프로젝트를 둘 만들어도 막지 않는다', async () => {
    const 하나 = await 프로젝트만들기('XPQ 같은 이름');
    const 둘 = await 프로젝트만들기('XPQ 같은 이름');
    expect([하나.statusCode, 둘.statusCode]).toEqual([201, 201]);
    expect(하나.json<{ id: number }>().id).not.toBe(둘.json<{ id: number }>().id);
  });

  it('이름을 바꾸면 목록에 반영되고, 없는 번호는 404 · 이름이 비면 400 이다', async () => {
    const { id } = (await 프로젝트만들기('XPQ 옛 이름')).json<{ id: number }>();
    const 고침 = await app.inject({ method: 'PATCH', url: `/api/settings/projects/${String(id)}`, payload: { name: ' XPQ 새 이름 ' } });
    expect([고침.statusCode, 고침.json()]).toEqual([200, { ok: true }]);
    const 목록 = await app.inject({ method: 'GET', url: '/api/settings/projects' });
    expect(목록.json<{ items: { id: number; name: string }[] }>().items).toContainEqual({ id, name: 'XPQ 새 이름' });

    const 없음 = await app.inject({ method: 'PATCH', url: '/api/settings/projects/999999999', payload: { name: 'x' } });
    expect([없음.statusCode, 없음.json()]).toEqual([404, { error: 'NOT_FOUND' }]);
    const 빈이름 = await app.inject({ method: 'PATCH', url: `/api/settings/projects/${String(id)}`, payload: { name: ' ' } });
    expect(빈이름.statusCode).toBe(400);
    const 숫자아님 = await app.inject({ method: 'PATCH', url: '/api/settings/projects/abc', payload: { name: 'x' } });
    expect(숫자아님.statusCode).toBe(400);
  });

  it('애플리케이션 만들기는 projectId 를 꼭 받는다 — 빠지면 400 · 없는 번호면 400 PROJECT_NOT_FOUND 이고 아무것도 안 만든다', async () => {
    const 빠짐 = await app.inject({ method: 'POST', url: '/api/settings/services', payload: 서비스본문(undefined) });
    expect([빠짐.statusCode, 빠짐.json<{ error: string }>().error]).toEqual([400, 'INVALID_REQUEST']);
    const 글자 = await app.inject({ method: 'POST', url: '/api/settings/services', payload: 서비스본문('1') });
    expect(글자.statusCode).toBe(400);
    const 너무큼 = await app.inject({ method: 'POST', url: '/api/settings/services', payload: 서비스본문(1e30) });
    expect([너무큼.statusCode, 너무큼.json<{ error: string }>().error]).toEqual([400, 'INVALID_REQUEST']);
    const 없는번호 = await app.inject({ method: 'POST', url: '/api/settings/services', payload: 서비스본문(999999999) });
    expect([없는번호.statusCode, 없는번호.json()]).toEqual([400, { error: 'PROJECT_NOT_FOUND' }]);
    expect((await 서비스목록()).some((s) => s.prefix === 접두사)).toBe(false);
  });

  it('프로젝트를 주고 만들면 목록 줄에 그 프로젝트가 실리고, 옮기면 바뀐다', async () => {
    const 앞 = (await 프로젝트만들기('XPQ 앞')).json<{ id: number }>().id;
    const 뒤 = (await 프로젝트만들기('XPQ 뒤')).json<{ id: number }>().id;
    const 만듦 = await app.inject({ method: 'POST', url: '/api/settings/services', payload: 서비스본문(앞) });
    expect(만듦.statusCode).toBe(201);
    서비스번호 = 만듦.json<{ id: number }>().id;
    expect((await 서비스목록()).find((s) => s.id === 서비스번호)).toMatchObject({ projectId: 앞, projectName: 'XPQ 앞' });

    const 옮김 = await app.inject({ method: 'PATCH', url: `/api/settings/services/${String(서비스번호)}`, payload: { projectId: 뒤 } });
    expect(옮김.statusCode).toBe(200);
    expect((await 서비스목록()).find((s) => s.id === 서비스번호)).toMatchObject({ projectId: 뒤, projectName: 'XPQ 뒤' });
    const 프로젝트들 = (await app.inject({ method: 'GET', url: '/api/settings/projects' })).json<{ items: { id: number }[] }>().items.map((p) => p.id);
    expect(프로젝트들).not.toContain(앞);
    expect(프로젝트들).toContain(뒤);

    const 같은곳 = await app.inject({ method: 'PATCH', url: `/api/settings/services/${String(서비스번호)}`, payload: { projectId: 뒤 } });
    expect(같은곳.statusCode).toBe(200);
    expect((await 서비스목록()).find((s) => s.id === 서비스번호)?.projectId).toBe(뒤);

    const 안옮김 = await app.inject({ method: 'PATCH', url: `/api/settings/services/${String(서비스번호)}`, payload: { name: 'XPQS 새 이름' } });
    expect(안옮김.statusCode).toBe(200);
    expect((await 서비스목록()).find((s) => s.id === 서비스번호)?.projectId).toBe(뒤);
  });

  it('없는 프로젝트로 옮기면 400 PROJECT_NOT_FOUND 이고 있던 자리에 그대로 있다', async () => {
    const 전 = (await 서비스목록()).find((s) => s.id === 서비스번호)!.projectId;
    const res = await app.inject({ method: 'PATCH', url: `/api/settings/services/${String(서비스번호)}`, payload: { projectId: 999999999 } });
    expect([res.statusCode, res.json()]).toEqual([400, { error: 'PROJECT_NOT_FOUND' }]);
    expect((await 서비스목록()).find((s) => s.id === 서비스번호)?.projectId).toBe(전);
  });

  it('/auth/me 의 애플리케이션 줄마다 속한 프로젝트와 종류가 실린다', async () => {
    const p = await pool();
    await p.query(
      `INSERT INTO app_user (username, display_name, password_hash, role, perm_dashboard, is_approved, must_change_password)
            VALUES ($1, 'xpq', 'x', 'member', 'none', true, false)`,
      [계정],
    );
    await p.query(
      `INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) SELECT $1, project_id, 'read', 'read', 'none' FROM service WHERE id = $2`,
      [계정, 서비스번호],
    );
    const 줄 = (await 서비스목록()).find((s) => s.id === 서비스번호)!;
    const 찾은것 = await 사용자와해시(계정);
    expect(찾은것?.user.services).toHaveLength(1);
    expect(찾은것?.user.services[0]).toMatchObject({ id: 서비스번호, projectId: 줄.projectId, projectName: 줄.projectName, kind: 'SCREEN' });
  });

  it('애플리케이션을 옮기면 옮겨 간 프로젝트의 권한을 따르고, 비게 된 프로젝트의 권한 줄은 같이 지워진다', async () => {
    const p = await pool();
    const 옮길곳 = (await 프로젝트만들기('XPQ 권한 따라가기')).json<{ id: number }>().id;
    await p.query(
      `INSERT INTO user_project (username, project_id, perm_cases, perm_runs, perm_authoring) VALUES ($1, $2, 'write', 'none', 'read')`,
      [계정, 옮길곳],
    );
    expect((await 사용자와해시(계정))?.user.services[0]?.permissions).toEqual({ cases: 'read', runs: 'read', authoring: 'none' });

    const 옮김 = await app.inject({ method: 'PATCH', url: `/api/settings/services/${String(서비스번호)}`, payload: { projectId: 옮길곳 } });
    expect(옮김.statusCode).toBe(200);
    expect((await 사용자와해시(계정))?.user.services[0]?.permissions).toEqual({ cases: 'write', runs: 'none', authoring: 'read' });
    const 남은줄 = await p.query('SELECT project_id FROM user_project WHERE username = $1', [계정]);
    expect(남은줄.rows.map((r) => Number(r.project_id))).toEqual([옮길곳]);
  });
});
