// 작성 통로 검사 — 방어 다섯이 실제로 무는지 본다 (SPEC 도메인/작성 §7)

import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import authoringRoutes from './routes.js';
import { 줄세우기 } from './store.js';

const 연결 = process.env.DATABASE_URL;

// fixture 접두사 XWAR — store.test.ts 의 XWA 와 갈라 쓴다.
// 둘 다 authoring_request 를 자기 service_id 로만 지운다 (CLAUDE.md §3)
const 접두사 = 'XWAR';

// 이 검사는 문(gate.ts)을 안 지난다. 등급 판정은 gate.test.ts 가 본다 —
// 여기서는 라우트가 본문과 자원을 어떻게 거르는지만 본다
function 사람(이름: string) {
  return { username: 이름, displayName: `${이름} 씨`, role: 'operator' as const, services: [] };
}

describe.skipIf(연결 === undefined)('작성 통로', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 남의서비스 = 0;
  let 부르는이 = '';

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const 만들기 = async (prefix: string): Promise<number> => {
      const r = await pool.query<{ id: string }>(
        `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
              VALUES ($1, $2, '#3A5FCD', '', $3)
         ON CONFLICT (prefix) DO UPDATE SET is_active = true
           RETURNING id`,
        [prefix, `${prefix} 통로 검사용`, prefix.toLowerCase()],
      );
      return Number(r.rows[0]!.id);
    };
    서비스 = await 만들기(접두사);
    남의서비스 = await 만들기(`${접두사}X`);
    await pool.query('DELETE FROM authoring_request WHERE service_id = ANY($1)', [
      [서비스, 남의서비스],
    ]);

    // 사진 뿌리를 검사가 스스로 정한다. 기본값 `/screenshots` 는 컨테이너 안 자리라
    // CI 와 맥에서 못 쓴다 — 부르는 쪽에 맡기면 그 자리에서 권한 오류로 죽는다
    process.env.SCREENSHOT_ROOT = await mkdtemp(join(tmpdir(), 'xwar-shots-'));

    부르는이 = `${접두사.toLowerCase()}-사람`;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = 사람(부르는이);
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = ANY($1)', [
      [서비스, 남의서비스],
    ]);
    await app.close();
  });

  describe('방어 ① 이 통로로는 머지가 안 들어온다', () => {
    it('kind 가 MERGE 면 400 — 경로를 가른 것만으로는 안 닫힌다', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/authoring/requests?service=${접두사}`,
        payload: { kind: 'MERGE', sourceId: 1, specText: '머지해줘' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('모르는 kind 도 400', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/authoring/requests?service=${접두사}`,
        payload: { kind: 'PUBLISH', specText: '기획서' },
      });
      expect(res.statusCode).toBe(400);
    });

    it('작성 요청은 201 로 줄에 선다', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/authoring/requests?service=${접두사}`,
        payload: { kind: 'AUTHOR', specText: '할 일을 한 건 만든다' },
      });
      expect(res.statusCode).toBe(201);
      expect(typeof res.json().id).toBe('number');
    });
  });

  describe('방어 ③ 본문에 실린 번호는 경로 검사가 안 닿는다', () => {
    it('sourceId 가 남의 서비스 행을 가리키면 403', async () => {
      const 남의것 = await 줄세우기({
        서비스: 남의서비스,
        kind: 'AUTHOR',
        기획서: '남의 기획서 본문',
        누가: 'x',
        이름: 'x',
      });
      const res = await app.inject({
        method: 'POST',
        url: `/api/authoring/requests?service=${접두사}`,
        payload: { kind: 'RERUN', sourceId: 남의것, specText: '다시' },
      });
      expect(res.statusCode).toBe(403);
    });

    it('머지 요청의 sourceId 가 남의 서비스면 403', async () => {
      const 남의것 = await 줄세우기({
        서비스: 남의서비스,
        kind: 'AUTHOR',
        기획서: '남의 기획서 본문',
        누가: 'x',
        이름: 'x',
      });
      const res = await app.inject({
        method: 'POST',
        url: `/api/authoring/merges?service=${접두사}`,
        payload: { sourceId: 남의것 },
      });
      expect(res.statusCode).toBe(403);
    });

    it('아직 안 끝난 요청은 머지할 수 없다 — 409', async () => {
      const 도는것 = await 줄세우기({
        서비스: 서비스,
        kind: 'AUTHOR',
        기획서: '아직 도는 중',
        누가: 'x',
        이름: 'x',
      });
      const res = await app.inject({
        method: 'POST',
        url: `/api/authoring/merges?service=${접두사}`,
        payload: { sourceId: 도는것 },
      });
      expect(res.statusCode).toBe(409);
    });
  });

  describe('방어 ④ 문과 라우트가 같은 값을 읽는다', () => {
    it.each(['1e3', 'abc', '99999999999999999999', '-1'])('번호가 %s 면 400', async (나쁜것) => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/authoring/requests/${나쁜것}?service=${접두사}`,
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('방어 ② 남의 서비스 줄은 안 집어 준다', () => {
    it('내 줄이 비었으면 남의 것이 있어도 204', async () => {
      await app.inject({ method: 'POST', url: `/api/authoring/requests/claim?service=${접두사}` });
      let 비웠나 = false;
      while (!비웠나) {
        const r = await app.inject({
          method: 'POST',
          url: `/api/authoring/requests/claim?service=${접두사}`,
        });
        비웠나 = r.statusCode === 204;
      }
      await 줄세우기({
        서비스: 남의서비스,
        kind: 'AUTHOR',
        기획서: '남의 기획서 본문',
        누가: 'x',
        이름: 'x',
      });
      const res = await app.inject({
        method: 'POST',
        url: `/api/authoring/requests/claim?service=${접두사}`,
      });
      expect(res.statusCode).toBe(204);
    });
  });

  describe('방어 ⑤ 집은 쪽만 그 행을 움직인다', () => {
    it('집지 않은 사람이 끝났다고 하면 403', async () => {
      await 줄세우기({
        서비스: 서비스,
        kind: 'AUTHOR',
        기획서: '남이 끝냈다고 하기',
        누가: 'x',
        이름: 'x',
      });
      const 집은것 = await app.inject({
        method: 'POST',
        url: `/api/authoring/requests/claim?service=${접두사}`,
      });
      const id = 집은것.json().id;

      부르는이 = `${접두사.toLowerCase()}-남`;
      const res = await app.inject({
        method: 'POST',
        url: `/api/authoring/requests/${id}/finish?service=${접두사}`,
        payload: { status: 'DONE', prUrl: '남이 고른 PR' },
      });
      부르는이 = `${접두사.toLowerCase()}-사람`;
      expect(res.statusCode).toBe(403);
    });

    it('집은 사람은 단계를 올리고 끝낼 수 있다', async () => {
      await 줄세우기({
        서비스: 서비스,
        kind: 'AUTHOR',
        기획서: '정상 흐름',
        누가: 'x',
        이름: 'x',
      });
      const 집은것 = await app.inject({
        method: 'POST',
        url: `/api/authoring/requests/claim?service=${접두사}`,
      });
      const id = 집은것.json().id;

      const 단계 = await app.inject({
        method: 'PATCH',
        url: `/api/authoring/requests/${id}/stage?service=${접두사}`,
        payload: { stage: '케이스 2건째' },
      });
      expect(단계.statusCode).toBe(200);

      const 끝 = await app.inject({
        method: 'POST',
        url: `/api/authoring/requests/${id}/finish?service=${접두사}`,
        payload: { status: 'DONE', prUrl: '내가 연 PR' },
      });
      expect(끝.statusCode).toBe(200);

      const 또 = await app.inject({
        method: 'POST',
        url: `/api/authoring/requests/${id}/finish?service=${접두사}`,
        payload: { status: 'DONE', prUrl: '덮어쓰기' },
      });
      expect(또.statusCode).toBe(409);
    });
  });

  describe('사진은 파일로 온다 — 맥은 다른 기계다', () => {
    it('집은 사람이 원시 바이트를 올리면 폴더를 준다', async () => {
      await 줄세우기({
        서비스: 서비스,
        kind: 'AUTHOR',
        기획서: '사진 올리기',
        누가: 'x',
        이름: 'x',
      });
      const 집은것 = await app.inject({
        method: 'POST',
        url: `/api/authoring/requests/claim?service=${접두사}`,
      });
      const id = 집은것.json().id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/authoring/requests/${id}/screenshots?service=${접두사}&name=1.png`,
        headers: { 'content-type': 'application/octet-stream' },
        payload: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().dir).toContain(String(id));
    });
  });

  describe('읽기', () => {
    it('대기줄 한 쪽은 그 서비스 것만 준다', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/authoring/requests?service=${접두사}`,
      });
      expect(res.statusCode).toBe(200);
      const 몸 = res.json();
      expect(몸.items.every((r: { serviceId: number }) => r.serviceId === 서비스)).toBe(true);
    });

    it('없는 번호는 404 — 「없는 것」과 「남의 것」이 안 뭉개진다', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/authoring/requests/99999999?service=${접두사}`,
      });
      expect(res.statusCode).toBe(404);
    });

    it('남의 서비스 번호는 403', async () => {
      const 남의것 = await 줄세우기({
        서비스: 남의서비스,
        kind: 'AUTHOR',
        기획서: '남의 기획서 본문',
        누가: 'x',
        이름: 'x',
      });
      const res = await app.inject({
        method: 'GET',
        url: `/api/authoring/requests/${남의것}?service=${접두사}`,
      });
      expect(res.statusCode).toBe(403);
    });
  });
});

