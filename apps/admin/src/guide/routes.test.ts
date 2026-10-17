// 서비스 가이드 API 가 도메인/작성 §7 「서비스 가이드 통로」의 경로 · 응답 · 거절을 지키는지 본다. 문 없이 라우트만 띄운다

import Fastify, { type FastifyInstance } from 'fastify';
import JSZip from 'jszip';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import guideAgentRoutes from './agentRoutes.js';
import guideRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XGD';
const 에이전트 = 'xgd-agent';

describe.skipIf(연결 === undefined)('서비스 가이드 API', () => {
  let app: FastifyInstance;
  let 서비스 = 0;
  let 뿌리 = '';
  let 부르는이 = 'xgd-person';
  const 원래 = { 뿌리: process.env.PLATFORM_ARTIFACTS_DIR, 맥: process.env.AUTHORING_AGENT_USER };

  const q = async <T extends object>(sql: string, 값: unknown[] = []) => {
    const { pool } = await import('../db/index.js');
    return pool.query<T & Record<string, unknown>>(sql, 값);
  };
  const 주소 = (경로: string) => `/api${경로}${경로.includes('?') ? '&' : '?'}service=${접두사}`;
  const 부르기 = (method: 'GET' | 'PUT' | 'DELETE', 경로: string, payload?: object) =>
    app.inject({ method, url: 주소(경로), ...(payload ? { payload } : {}) });
  const 올리기 = (질의: string, 몸: Buffer | string) =>
    app.inject({ method: 'POST', url: 주소(`/guide/files?${질의}`), headers: { 'content-type': 'application/octet-stream' }, payload: 몸 });
  const 글저장 = (baseVersion: number, 글: Partial<Record<'intro' | 'policy' | 'rules', string>> = {}) =>
    부르기('PUT', '/guide', { baseVersion, intro: '', policy: '', rules: '', ...글 });

  const 치우기 = async () => {
    await q('DELETE FROM service_guide_version WHERE service_id = $1', [서비스]);
    await q('DELETE FROM service_guide_file WHERE service_id = $1', [서비스]);
    await q('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    if (뿌리 !== '') await rm(join(뿌리, 'service-guide'), { recursive: true, force: true });
  };

  beforeAll(async () => {
    const s = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ($1, $2, '#3A5FCD', '', 'xgd')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
      [접두사, `${접두사} 서비스 가이드 검사용`],
    );
    서비스 = Number(s.rows[0]!.id);
    뿌리 = await mkdtemp(join(tmpdir(), 'xgd-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 뿌리;
    process.env.AUTHORING_AGENT_USER = 에이전트;
    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 부르는이, displayName: '검사', role: 'member' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await app.register(guideRoutes, { prefix: '/api' });
    await app.register(guideAgentRoutes, { prefix: '/api' });
    await app.ready();
  });

  beforeEach(async () => {
    부르는이 = 'xgd-person';
    await 치우기();
  });

  afterAll(async () => {
    await app.close();
    await 치우기();
    await q('DELETE FROM service WHERE id = $1', [서비스]);
    await rm(뿌리, { recursive: true, force: true });
    process.env.PLATFORM_ARTIFACTS_DIR = 원래.뿌리;
    process.env.AUTHORING_AGENT_USER = 원래.맥;
  });

  it('가이드가 없으면 판 0 · 빈 글 · 빈 파일이고 빈 글 저장은 판을 안 만든다', async () => {
    expect((await 부르기('GET', '/guide')).json()).toEqual({ version: 0, intro: '', policy: '', rules: '', files: [], savedAt: null, savedByName: null });
    expect((await 글저장(0)).json()).toEqual({ version: 0 });
    expect((await 부르기('GET', '/guide/versions')).json()).toEqual([]);
  });

  it('글 저장은 새 판이고 같은 글이면 지금 판 번호, 낡은 판이면 409 GUIDE_STALE', async () => {
    expect((await 글저장(0, { intro: '테스트 주문은 qa- 로 시작' })).json()).toEqual({ version: 1 });
    expect((await 글저장(1, { intro: '테스트 주문은 qa- 로 시작' })).json()).toEqual({ version: 1 });
    const 늦음 = await 글저장(0, { rules: '결제는 테스트 카드만' });
    expect(늦음.statusCode).toBe(409);
    expect(늦음.json()).toEqual({ error: 'GUIDE_STALE', latest: 1 });
    const 판 = (await 부르기('GET', '/guide')).json();
    expect(판).toMatchObject({ version: 1, intro: '테스트 주문은 qa- 로 시작', savedByName: '검사' });
  });

  it('틀린 칸은 400 BAD_GUIDE 와 그 칸 이름', async () => {
    expect((await 부르기('PUT', '/guide', { baseVersion: -1, intro: '', policy: '', rules: '' })).json()).toEqual({ error: 'BAD_GUIDE', detail: 'baseVersion' });
    expect((await 부르기('PUT', '/guide', { baseVersion: 0, intro: '', policy: 'ㄱ'.repeat(20_001), rules: '' })).json()).toEqual({ error: 'BAD_GUIDE', detail: 'policy' });
    expect((await 올리기('section=etc&baseVersion=0&name=a.md', 'x')).json()).toEqual({ error: 'BAD_GUIDE', detail: 'section' });
    expect((await 올리기('section=intro&baseVersion=x&name=a.md', 'x')).json()).toEqual({ error: 'BAD_GUIDE', detail: 'baseVersion' });
    expect((await 부르기('GET', '/guide/versions/0')).json()).toEqual({ error: 'BAD_GUIDE', detail: 'version' });
    expect((await 부르기('GET', '/guide/versions/9')).statusCode).toBe(404);
  });

  it('파일 종류 · 이름은 자료 규칙 그대로다', async () => {
    expect((await 올리기('section=intro&baseVersion=0&name=a.exe', 'x')).json()).toEqual({ error: 'BAD_FILE_TYPE', detail: '.exe' });
    expect((await 올리기('section=intro&baseVersion=0&name=..%2Fa.md', 'x')).json()).toEqual({ error: 'BAD_NAME' });
    expect((await 올리기('section=intro&baseVersion=0&name=a.md', '')).json()).toEqual({ error: 'EMPTY_BODY' });
  });

  it('파일 더하기 · 빼기는 판마다 하나이고 변경 기록이 앞 판과 견줘 보인다. 뺀 파일도 디스크와 내려받기에 남는다', async () => {
    await 글저장(0, { intro: '소개' });
    const 더함 = await 올리기(`section=policy&baseVersion=1&name=${encodeURIComponent('정책 문서.md')}`, '# 정책');
    expect(더함.statusCode).toBe(201);
    const { version, fileId } = 더함.json<{ version: number; fileId: number }>();
    expect(version).toBe(2);
    expect((await 부르기('GET', '/guide')).json()).toMatchObject({ version: 2, intro: '소개', files: [{ id: fileId, name: '정책 문서.md', size: 8, section: 'policy', uploadedByName: '검사' }] });
    expect(await readdir(join(뿌리, 'service-guide', String(서비스)))).toEqual([`${String(fileId)}.md`]);

    expect((await 부르기('DELETE', `/guide/files/${String(fileId)}?baseVersion=1`)).json()).toEqual({ error: 'GUIDE_STALE', latest: 2 });
    expect((await 부르기('DELETE', `/guide/files/${String(fileId)}?baseVersion=2`)).json()).toEqual({ version: 3 });
    expect((await 부르기('DELETE', `/guide/files/${String(fileId)}?baseVersion=3`)).statusCode).toBe(404);

    const 기록 = (await 부르기('GET', '/guide/versions')).json<{ version: number; changed: unknown }[]>();
    expect(기록.map((x) => [x.version, x.changed])).toEqual([
      [3, { sections: [], added: [], removed: [{ name: '정책 문서.md', section: 'policy' }] }],
      [2, { sections: [], added: [{ name: '정책 문서.md', section: 'policy' }], removed: [] }],
      [1, { sections: ['intro'], added: [], removed: [] }],
    ]);
    expect((await 부르기('GET', '/guide/versions/2')).json()).toMatchObject({ version: 2, files: [{ id: fileId }] });

    const 받음 = await 부르기('GET', `/guide/files/${String(fileId)}`);
    expect(받음.headers['content-type']).toBe('application/octet-stream');
    expect(받음.headers['content-disposition']).toBe(`attachment; filename*=UTF-8''${encodeURIComponent('정책 문서.md')}`);
    expect(받음.headers['x-content-type-options']).toBe('nosniff');
    expect(받음.body).toBe('# 정책');
    expect((await 부르기('GET', `/guide/files/${String(fileId)}/text`)).json()).toEqual({ text: '# 정책' });
  });

  it('지금 판 파일이 20개면 409 GUIDE_FULL 이고 디스크에 남는 파일이 없다', async () => {
    for (let i = 0; i < 20; i++) expect((await 올리기(`section=rules&baseVersion=${String(i)}&name=r${String(i)}.txt`, 'x')).statusCode).toBe(201);
    expect((await 올리기('section=rules&baseVersion=20&name=r20.txt', 'x')).json()).toEqual({ error: 'GUIDE_FULL' });
    expect(await readdir(join(뿌리, 'service-guide', String(서비스)))).toHaveLength(20);
  });

  it('디스크에 쓴 뒤 판 행이 실패하면 되돌리고 쓴 파일을 지운다', async () => {
    await q(`CREATE OR REPLACE FUNCTION xgd_막기() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'xgd 검사'; END $$ LANGUAGE plpgsql`);
    await q(`CREATE TRIGGER xgd_막기 BEFORE INSERT ON service_guide_version FOR EACH ROW WHEN (NEW.service_id = ${String(서비스)}) EXECUTE FUNCTION xgd_막기()`);
    try {
      expect((await 올리기('section=intro&baseVersion=0&name=a.md', 'A')).statusCode).toBe(500);
    } finally {
      await q('DROP TRIGGER IF EXISTS xgd_막기 ON service_guide_version');
      await q('DROP FUNCTION IF EXISTS xgd_막기()');
    }
    expect(await readdir(join(뿌리, 'service-guide', String(서비스)))).toEqual([]);
    expect((await q<{ n: number }>('SELECT count(*)::int AS n FROM service_guide_file WHERE service_id = $1', [서비스])).rows[0]!.n).toBe(0);
  });

  it('INTEGER 를 넘는 판 번호는 없는 판이라 404', async () => {
    expect((await 부르기('GET', '/guide/versions/9999999999')).statusCode).toBe(404);
  });

  it('통틀어 200개를 올렸으면 뺀 것도 세어 409 GUIDE_FULL', async () => {
    await q(
      `INSERT INTO service_guide_file (service_id, name, size, uploaded_by, uploaded_by_name)
       SELECT $1, 'old' || g || '.txt', 1, 'xgd', '검사' FROM generate_series(1, 200) g`,
      [서비스],
    );
    expect((await 올리기('section=intro&baseVersion=0&name=a.txt', 'x')).json()).toEqual({ error: 'GUIDE_FULL' });
  });

  it('열기 — docx 는 글자, pdf 는 text 에서 415 NO_TEXT 이고 pdf 통로가 sandbox 로 준다. PDF 머리가 아니면 415 NOT_PDF', async () => {
    const zip = new JSZip();
    zip.file('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>결제는 테스트 카드만</w:t></w:r></w:p></w:body></w:document>');
    const 워드 = (await 올리기('section=policy&baseVersion=0&name=p.docx', await zip.generateAsync({ type: 'nodebuffer' }))).json<{ fileId: number }>();
    expect((await 부르기('GET', `/guide/files/${String(워드.fileId)}/text`)).json()).toEqual({ text: '결제는 테스트 카드만' });

    const pdf = (await 올리기('section=intro&baseVersion=1&name=intro.pdf', '%PDF-1.4\n%%EOF')).json<{ fileId: number }>();
    const 글 = await 부르기('GET', `/guide/files/${String(pdf.fileId)}/text`);
    expect([글.statusCode, 글.json()]).toEqual([415, { error: 'NO_TEXT' }]);
    const 열기 = await 부르기('GET', `/guide/files/${String(pdf.fileId)}/pdf`);
    expect(열기.statusCode).toBe(200);
    expect(열기.headers).toMatchObject({
      'content-type': 'application/pdf',
      'content-disposition': "inline; filename*=UTF-8''intro.pdf",
      'x-content-type-options': 'nosniff',
      'content-security-policy': 'sandbox',
    });

    const 가짜 = (await 올리기('section=intro&baseVersion=2&name=fake.pdf', '<html><script>alert(1)</script>')).json<{ fileId: number }>();
    const 막힘 = await 부르기('GET', `/guide/files/${String(가짜.fileId)}/pdf`);
    expect([막힘.statusCode, 막힘.json()]).toEqual([415, { error: 'NOT_PDF' }]);
  });

  it('남의 서비스 파일 번호는 404 다', async () => {
    const 남 = await q<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ('XGDB', 'XGDB 남의 서비스', '#3A5FCD', '', 'xgdb')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
    );
    const 남서비스 = 남.rows[0]!.id;
    try {
      const f = await q<{ id: string }>(
        `INSERT INTO service_guide_file (service_id, name, size, uploaded_by, uploaded_by_name) VALUES ($1, 'x.md', 1, 'xgd', '검사') RETURNING id`,
        [남서비스],
      );
      expect((await 부르기('GET', `/guide/files/${f.rows[0]!.id}`)).statusCode).toBe(404);
    } finally {
      await q('DELETE FROM service_guide_file WHERE service_id = $1', [남서비스]);
      await q('DELETE FROM service WHERE id = $1', [남서비스]);
    }
  });

  it('행은 있는데 디스크에 파일이 없으면 500 이 아니라 404', async () => {
    const { fileId } = (await 올리기('section=intro&baseVersion=0&name=a.md', 'A')).json<{ fileId: number }>();
    await rm(join(뿌리, 'service-guide', String(서비스), `${String(fileId)}.md`));
    for (const 끝 of ['', '/text', '/pdf']) expect((await 부르기('GET', `/guide/files/${String(fileId)}${끝}`)).statusCode).toBe(404);
  });

  describe('에이전트 통로', () => {
    const 요청넣기 = async (status: string) => {
      const r = await q<{ id: string }>(
        `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status, claimed_by)
         VALUES ($1, 'AUTHOR', '{}', 'xgd', '검사', $2, $3) RETURNING id`,
        [서비스, status, 에이전트],
      );
      return Number(r.rows[0]!.id);
    };

    it('지금 판을 사람 이름 · 크기 없이 주고 파일은 지금 판 것만 내려준다', async () => {
      await 글저장(0, { rules: '훑지 말 것: /admin' });
      const 남김 = (await 올리기('section=intro&baseVersion=1&name=a.md', 'A')).json<{ fileId: number }>();
      const 뺌 = (await 올리기('section=intro&baseVersion=2&name=b.md', 'B')).json<{ fileId: number }>();
      await 부르기('DELETE', `/guide/files/${String(뺌.fileId)}?baseVersion=3`);
      const id = await 요청넣기('RUNNING');
      부르는이 = 에이전트;
      expect((await app.inject({ method: 'GET', url: `/api/authoring/requests/${String(id)}/guide` })).json()).toEqual({
        version: 4,
        intro: '',
        policy: '',
        rules: '훑지 말 것: /admin',
        files: [{ id: 남김.fileId, name: 'a.md', section: 'intro' }],
      });
      const 받음 = await app.inject({ method: 'GET', url: `/api/authoring/requests/${String(id)}/guide/files/${String(남김.fileId)}` });
      expect([받음.body, 받음.headers['content-type']]).toEqual(['A', 'application/octet-stream']);
      expect((await app.inject({ method: 'GET', url: `/api/authoring/requests/${String(id)}/guide/files/${String(뺌.fileId)}` })).statusCode).toBe(404);
    });

    it('맥 계정이 아니면 403, 끝난 요청이면 409', async () => {
      const id = await 요청넣기('RUNNING');
      expect((await app.inject({ method: 'GET', url: `/api/authoring/requests/${String(id)}/guide` })).json()).toEqual({ error: 'NOT_AUTHORING_AGENT' });
      부르는이 = 에이전트;
      const 끝난것 = await 요청넣기('DONE');
      const r = await app.inject({ method: 'GET', url: `/api/authoring/requests/${String(끝난것)}/guide` });
      expect([r.statusCode, r.json()]).toEqual([409, { error: 'NOT_RUNNING', detail: 'DONE' }]);
    });
  });
});
