// 산출물 올리기 통로 검사 — 표시 사본·역기획서 (SPEC 도메인/작성 §7 outputs · 「자료」)

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import authoringAgentRoutes from './agentRoutes.js';
import assetRoutes from './assets.js';
import { 자료더하기, 자료목록, 준비세우기 } from './assetStore.js';
import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XWO';

describe.skipIf(연결 === undefined)('산출물 올리기', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  const 에이전트 = `${접두사.toLowerCase()}-에이전트`;
  let 부르는이 = 에이전트;
  let 요청 = 0;
  const 입력: Record<string, number> = {};
  let 남의자료 = 0;

  async function 도는요청(): Promise<{ id: number; 자료: Record<string, number> }> {
    const { pool } = await import('../db/index.js');
    const id = await 준비세우기({
      서비스,
      누가: 에이전트,
      이름: '산출물 검사',
      피그마: ['https://www.figma.com/design/AbC123/'],
    });
    const 자료: Record<string, number> = {};
    for (const 이름 of ['기획서.docx', '옛기획서.doc', '화면정의.pdf']) {
      const 붙은것 = await 자료더하기(id, { name: 이름, size: 10 });
      if (typeof 붙은것 === 'string') throw new Error(붙은것);
      자료[이름] = 붙은것.id;
    }
    await pool.query(`UPDATE authoring_request SET status = 'RUNNING', claimed_by = $2 WHERE id = $1`, [id, 에이전트]);
    return { id, 자료 };
  }

  const 올리기 = (id: number, 질의: string, 몸 = Buffer.from('PK 산출물')) =>
    app.inject({
      method: 'POST',
      url: `/api/authoring/requests/${id}/outputs?${질의}`,
      headers: { 'content-type': 'application/octet-stream' },
      payload: 몸,
    });

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', 'https://github.com/acme/xwo', 'xwo')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 산출물 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);

    process.env.PLATFORM_ARTIFACTS_DIR = await mkdtemp(join(tmpdir(), 'xwo-outputs-'));
    process.env.AUTHORING_AGENT_USER = 에이전트;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 부르는이, displayName: '산출물 검사', role: 'operator' as const, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.register(assetRoutes, { prefix: '/api' });
    await app.register(authoringAgentRoutes, { prefix: '/api' });
    await app.ready();

    const 하나 = await 도는요청();
    요청 = 하나.id;
    Object.assign(입력, 하나.자료);
    남의자료 = (await 도는요청()).자료['기획서.docx']!;
  });

  beforeEach(() => {
    부르는이 = 에이전트;
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  it('표시 사본을 올리면 상세 자료 목록에 MARKED 로 서고 원본을 가리킨다', async () => {
    const res = await 올리기(요청, `name=${encodeURIComponent('기획서-표시.docx')}&role=MARKED&source=${입력['기획서.docx']}`);
    expect(res.statusCode).toBe(200);
    const id = res.json<{ id: number }>().id;
    const 상세 = await app.inject({ method: 'GET', url: `/api/authoring/requests/${요청}` });
    expect(상세.json<{ assets: unknown[] }>().assets).toContainEqual(
      expect.objectContaining({ id, kind: 'FILE', name: '기획서-표시.docx', role: 'MARKED', sourceAssetId: 입력['기획서.docx'] }),
    );
  });

  it('올린 산출물은 입력과 같은 헤더로 내려받는다 — 브라우저가 열지 못하게', async () => {
    const id = (await 올리기(요청, 'name=reverse.docx&role=REVERSE_SPEC', Buffer.from('역기획서'))).json<{ id: number }>().id;
    const res = await app.inject({ method: 'GET', url: `/api/authoring/requests/${요청}/assets/${id}` });
    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('역기획서');
    expect(res.headers['content-type']).toBe('application/octet-stream');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('옛 .doc 원본의 표시 사본은 .docx 로 낸다', async () => {
    expect((await 올리기(요청, `name=old-marked.docx&role=MARKED&source=${입력['옛기획서.doc']}`)).statusCode).toBe(200);
    const res = await 올리기(요청, `name=old-marked.doc&role=MARKED&source=${입력['옛기획서.doc']}`);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'BAD_FILE_TYPE' });
  });

  it('표시 사본은 원본과 확장자가 같아야 한다', async () => {
    expect((await 올리기(요청, `name=spec-marked.pdf&role=MARKED&source=${입력['화면정의.pdf']}`)).statusCode).toBe(200);
    const res = await 올리기(요청, `name=spec-marked.docx&role=MARKED&source=${입력['화면정의.pdf']}`);
    expect(res.json()).toMatchObject({ error: 'BAD_FILE_TYPE' });
  });

  it('역기획서는 .docx 만 받는다', async () => {
    const res = await 올리기(요청, 'name=reverse.pdf&role=REVERSE_SPEC');
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: 'BAD_FILE_TYPE' });
  });

  it('역기획서에 원본이 오면 400 BAD_SOURCE', async () => {
    const res = await 올리기(요청, `name=reverse.docx&role=REVERSE_SPEC&source=${입력['기획서.docx']}`);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: 'BAD_SOURCE' });
  });

  it('역할이 MARKED·REVERSE_SPEC 밖이면 400', async () => {
    expect((await 올리기(요청, 'name=x.docx&role=INPUT')).statusCode).toBe(400);
    expect((await 올리기(요청, 'name=x.docx')).statusCode).toBe(400);
  });

  it('표시 사본의 원본이 없거나 남의 요청 것이거나 피그마거나 산출물이면 400 BAD_SOURCE', async () => {
    const 피그마 = (await 자료목록(요청)).find((a) => a.kind === 'FIGMA')!.id;
    const 산출물 = (await 자료목록(요청)).find((a) => a.role === 'MARKED')!.id;
    for (const source of ['', 'abc', String(남의자료), String(피그마), String(산출물), '9999999999']) {
      const res = await 올리기(요청, `name=m.docx&role=MARKED&source=${source}`);
      expect(res.json(), `source=${source}`).toEqual({ error: 'BAD_SOURCE' });
    }
    expect((await 올리기(요청, 'name=m.docx&role=MARKED')).json()).toEqual({ error: 'BAD_SOURCE' });
  });

  it('이름이 경로처럼 생겼으면 400 BAD_NAME', async () => {
    const res = await 올리기(요청, `name=${encodeURIComponent('../x.docx')}&role=REVERSE_SPEC`);
    expect(res.json()).toEqual({ error: 'BAD_NAME' });
  });

  it('빈 몸은 400', async () => {
    expect((await 올리기(요청, 'name=r.docx&role=REVERSE_SPEC', Buffer.alloc(0))).statusCode).toBe(400);
  });

  it('작성 에이전트가 아니면 403 · 집은 쪽이 아니면 403', async () => {
    부르는이 = 'xwo-사람';
    expect((await 올리기(요청, 'name=r.docx&role=REVERSE_SPEC')).json()).toEqual({ error: 'NOT_AUTHORING_AGENT' });
    부르는이 = 에이전트;
    const { pool } = await import('../db/index.js');
    const 남 = await 도는요청();
    await pool.query(`UPDATE authoring_request SET claimed_by = 'xwo-남' WHERE id = $1`, [남.id]);
    expect((await 올리기(남.id, 'name=r.docx&role=REVERSE_SPEC')).json()).toEqual({ error: 'NOT_CLAIMER' });
  });

  it('도는 중이 아니면 409', async () => {
    const { pool } = await import('../db/index.js');
    const 끝난것 = await 도는요청();
    await pool.query(`UPDATE authoring_request SET status = 'DONE' WHERE id = $1`, [끝난것.id]);
    const res = await 올리기(끝난것.id, 'name=r.docx&role=REVERSE_SPEC');
    expect(res.statusCode).toBe(409);
  });

  it('자료 개수 상한에 세지 않는다 — 입력이 가득 찬 요청에도 올라간다', async () => {
    const { pool } = await import('../db/index.js');
    const 꽉찬 = await 준비세우기({ 서비스, 누가: 에이전트, 이름: '꽉 찬 요청', 피그마: [] });
    for (let i = 0; i < 20; i += 1) await 자료더하기(꽉찬, { name: `p${i}.pdf`, size: 1 });
    await pool.query(`UPDATE authoring_request SET status = 'RUNNING', claimed_by = $2 WHERE id = $1`, [꽉찬, 에이전트]);
    expect((await 올리기(꽉찬, 'name=r.docx&role=REVERSE_SPEC')).statusCode).toBe(200);
    expect((await 올리기(꽉찬, 'name=r2.docx&role=REVERSE_SPEC')).statusCode).toBe(200);
  });

  it('동시에 둘을 올려도 둘 다 선다 — 순서 번호가 겹쳐 500 이 나지 않는다', async () => {
    const 결과 = await Promise.all([
      올리기(요청, 'name=c1.docx&role=REVERSE_SPEC'),
      올리기(요청, 'name=c2.docx&role=REVERSE_SPEC'),
      올리기(요청, 'name=c3.docx&role=REVERSE_SPEC'),
    ]);
    expect(결과.map((r) => r.statusCode)).toEqual([200, 200, 200]);
  });
});
