// 작성 자료 통로 검사 — 올리기 · 줄에 세우기 · 내려받기 (SPEC 도메인/작성 §7 「자료」)

import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import assetRoutes from './assets.js';
import { 자료목록, 준비세우기 } from './assetStore.js';
import { 줄세우기, 한건 } from './store.js';

const 연결 = process.env.DATABASE_URL;

// fixture 접두사 XWU — authoring_request 를 자기 service_id 로만 지운다 (CLAUDE.md §3)
const 접두사 = 'XWU';

// 이 검사는 문(gate.ts)을 안 지난다. 등급과 서비스 경계는 gate.test.ts · scope.test.ts 가 본다
function 사람(이름: string) {
  return { username: 이름, displayName: `${이름} 씨`, role: 'operator' as const, services: [] };
}

describe.skipIf(연결 === undefined)('작성 자료 통로', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 부르는이 = 'xwu-나';
  let 뿌리 = '';

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', '', $3)
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 자료 통로 검사용`, 접두사.toLowerCase()],
    );
    서비스 = Number(r.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);

    뿌리 = await mkdtemp(join(tmpdir(), 'xwu-assets-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 뿌리;

    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = 사람(부르는이);
    });
    await app.register(assetRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await rm(뿌리, { recursive: true, force: true });
    await app.close();
  });

  const 준비 = (피그마: string[] = []) => 준비세우기({ 서비스, 누가: 'xwu-나', 이름: '나', 피그마 });

  const 올리기 = (id: number, 이름: string, 몸: Buffer = Buffer.from('%PDF-1.4')) =>
    app.inject({
      method: 'POST',
      url: `/api/authoring/requests/${String(id)}/assets?name=${encodeURIComponent(이름)}`,
      headers: { 'content-type': 'application/octet-stream' },
      payload: 몸,
    });

  describe('올리기', () => {
    it('요청한 사람이 DRAFT 행에 한글 이름 파일을 올리면 200 · 디스크 이름은 자료 번호다', async () => {
      const id = await 준비();
      const res = await 올리기(id, '기획서.pdf');
      expect(res.statusCode).toBe(200);
      const 자료id = res.json().id as number;
      const 자료 = await 자료목록(id);
      expect(자료.map((a) => [a.kind, a.name, a.size])).toEqual([['FILE', '기획서.pdf', 8]]);
      const 디스크 = await readFile(join(뿌리, 'authoring-assets', String(id), `${String(자료id)}.pdf`));
      expect(디스크.toString()).toBe('%PDF-1.4');
    });

    it('남이 올리면 403 NOT_REQUESTER', async () => {
      const id = await 준비();
      부르는이 = 'xwu-남';
      const res = await 올리기(id, '기획서.pdf');
      부르는이 = 'xwu-나';
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe('NOT_REQUESTER');
    });

    it('줄에 선 행에는 409', async () => {
      const id = await 줄세우기({ 서비스, kind: 'AUTHOR', 기획서: '옛 행', 누가: 'xwu-나', 이름: '나' });
      expect((await 올리기(id, '기획서.pdf')).statusCode).toBe(409);
    });

    it.each(['a/b.pdf', 'a\\b.pdf', '..pdf', '../x.pdf', 'a".pdf', 'a\u0000.pdf', 'a\n.pdf', ''])(
      '이름 %j 는 400 BAD_NAME',
      async (이름) => {
        const id = await 준비();
        const res = await 올리기(id, 이름);
        expect(res.statusCode).toBe(400);
        expect(res.json().error).toBe('BAD_NAME');
      },
    );

    it.each(['기획서.hwp', '발표.pptx', '이름없음'])('%s 는 400 BAD_FILE_TYPE', async (이름) => {
      const id = await 준비();
      const res = await 올리기(id, 이름);
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toBe('BAD_FILE_TYPE');
    });

    it('JSON 통로 상한(1MB)보다 큰 파일도 20MB 안이면 받는다', async () => {
      const id = await 준비();
      expect((await 올리기(id, '큰것.pdf', Buffer.alloc(5 * 1024 * 1024))).statusCode).toBe(200);
    });

    it('20MB 를 넘으면 413', async () => {
      const id = await 준비();
      const res = await 올리기(id, '큰것.pdf', Buffer.alloc(20 * 1024 * 1024 + 1));
      expect(res.statusCode).toBe(413);
    });

    it('자료 개수 상한이면 409 TOO_MANY_ASSETS', async () => {
      const id = await 준비(Array.from({ length: 20 }, (_, i) => `https://www.figma.com/design/K${String(i)}/`));
      const res = await 올리기(id, '기획서.pdf');
      expect(res.statusCode).toBe(409);
      expect(res.json().error).toBe('TOO_MANY_ASSETS');
    });

    it('번호가 1e3 이면 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/authoring/requests/1e3/assets?name=a.pdf',
        headers: { 'content-type': 'application/octet-stream' },
        payload: Buffer.from('x'),
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('줄에 세우기', () => {
    const 세우기 = (id: number) =>
      app.inject({ method: 'POST', url: `/api/authoring/requests/${String(id)}/submit` });

    it('자료가 있는 DRAFT 는 200 · PENDING', async () => {
      const id = await 준비(['https://www.figma.com/design/A1/']);
      const res = await 세우기(id);
      expect(res.statusCode).toBe(200);
      expect((await 한건(id))?.status).toBe('PENDING');
    });

    it('자료가 0 이면 409 NO_ASSETS', async () => {
      const id = await 준비();
      const res = await 세우기(id);
      expect(res.statusCode).toBe(409);
      expect(res.json().error).toBe('NO_ASSETS');
      expect((await 한건(id))?.status).toBe('DRAFT');
    });

    it('두 번 세우면 두 번째는 409', async () => {
      const id = await 준비(['https://www.figma.com/design/A1/']);
      expect((await 세우기(id)).statusCode).toBe(200);
      expect((await 세우기(id)).statusCode).toBe(409);
    });

    it('남이 세우면 403', async () => {
      const id = await 준비(['https://www.figma.com/design/A1/']);
      부르는이 = 'xwu-남';
      const res = await 세우기(id);
      부르는이 = 'xwu-나';
      expect(res.statusCode).toBe(403);
      expect((await 한건(id))?.status).toBe('DRAFT');
    });
  });

  describe('내려받기', () => {
    const 받기 = (id: number | string, 자료: number | string) =>
      app.inject({ method: 'GET', url: `/api/authoring/requests/${String(id)}/assets/${String(자료)}` });

    it('올린 바이트 그대로 · 브라우저가 열지 못하게 준다', async () => {
      const id = await 준비();
      const 자료id = (await 올리기(id, '기획서 (최종).pdf', Buffer.from('본문 바이트'))).json().id as number;
      부르는이 = 'xwu-맥';
      const res = await 받기(id, 자료id);
      부르는이 = 'xwu-나';
      expect(res.statusCode).toBe(200);
      expect(res.rawPayload.toString()).toBe('본문 바이트');
      expect(res.headers['content-type']).toBe('application/octet-stream');
      expect(res.headers['content-disposition']).toBe(
        "attachment; filename*=UTF-8''%EA%B8%B0%ED%9A%8D%EC%84%9C%20%28%EC%B5%9C%EC%A2%85%29.pdf",
      );
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('다른 요청의 자료 번호면 404', async () => {
      const 가 = await 준비();
      const 자료id = (await 올리기(가, '기획서.pdf')).json().id as number;
      const 나 = await 준비();
      expect((await 받기(나, 자료id)).statusCode).toBe(404);
    });

    it('피그마 자료면 404', async () => {
      const id = await 준비(['https://www.figma.com/design/A1/']);
      const [피그마] = await 자료목록(id);
      expect((await 받기(id, 피그마!.id)).statusCode).toBe(404);
    });

    it('자료 번호가 1e3 이면 400', async () => {
      const id = await 준비();
      expect((await 받기(id, '1e3')).statusCode).toBe(400);
    });
  });
});
