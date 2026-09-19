// 증적 API가 SPEC §7 Reporting의 두 주소와 응답 형태를 지키는지 본다.
// CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Fastify, { type FastifyInstance } from 'fastify';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import reportingRoutes from './routes.js';
import { claim, fail, findDocument, type EvidenceRow } from './store.js';

const 연결 = process.env.DATABASE_URL;

const 제목 = 'XDR 증적 라우트 실행';

const 실행 = `
  INSERT INTO test_run (title, triggered_by, triggered_by_name, env, status, service_name, tests_repo, base_url)
  VALUES ($1, 'tester', '검수자', 'demo', $2, '', 'xdr-routes', 'https://xdr-routes.example.com')
  RETURNING run_id`;

describe.skipIf(연결 === undefined)('증적 API', () => {
  let app: FastifyInstance;
  let pool: Pool;
  let runId: number;
  let 증적폴더: string;

  // 배경에서 파일이 만들어진다. 고정 대기는 느린 기계에서 흔들리므로 DB 상태가 바뀔 때까지 짧게 되묻는다
  async function 끝날때까지(id: number, 상한ms = 20_000): Promise<EvidenceRow> {
    const 마감 = Date.now() + 상한ms;
    for (;;) {
      const 문서 = await findDocument(id);
      if (문서 !== null && 문서.status !== 'PENDING') return 문서;
      if (Date.now() > 마감) throw new Error(`증적 문서 ${String(id)}가 제 시간에 끝나지 않았다`);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  // 제목 접두사를 공유해야 afterAll 의 정리가 이 행들까지 데려간다
  async function 실행을만든다(status: string): Promise<number> {
    const run = await pool.query<{ run_id: string }>(실행, [`${제목} ${status}`, status]);
    return Number(run.rows[0].run_id);
  }

  async function 치운다(): Promise<void> {
    await pool.query(
      'DELETE FROM evidence_document WHERE run_id IN (SELECT run_id FROM test_run WHERE title LIKE $1)',
      [`${제목}%`],
    );
  }

  async function 실행까지치운다(): Promise<void> {
    await 치운다();
    await pool.query('DELETE FROM test_run WHERE title LIKE $1', [`${제목}%`]);
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 실행까지치운다();
    const run = await pool.query<{ run_id: string }>(실행, [제목, 'FINISHED']);
    runId = Number(run.rows[0].run_id);

    증적폴더 = await mkdtemp(join(tmpdir(), 'xdr-evidence-'));
    process.env.PLATFORM_ARTIFACTS_DIR = 증적폴더;

    app = Fastify();
    await app.register(reportingRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await 실행까지치운다();
    await rm(증적폴더, { recursive: true, force: true });
    delete process.env.PLATFORM_ARTIFACTS_DIR;
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  beforeEach(치운다);

  it('POST /api/runs/:runId/evidence — 다 만들기를 기다리지 않고 PENDING으로 먼저 답한다', async () => {
    const res = await app.inject({ method: 'POST', url: `/api/runs/${String(runId)}/evidence`, payload: { format: 'HTML' } });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(Object.keys(body).sort()).toEqual(['error', 'filePath', 'format', 'generatedAt', 'id', 'status']);
    expect(body).toMatchObject({ format: 'HTML', status: 'PENDING', filePath: null, error: null });
    expect(typeof body.id).toBe('number');
    expect(typeof body.generatedAt).toBe('string');

    await 끝날때까지(body.id);
  });

  it('format이 PDF·XLSX·HTML이 아니면 400이다', async () => {
    const res = await app.inject({ method: 'POST', url: `/api/runs/${String(runId)}/evidence`, payload: { format: 'DOCX' } });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('INVALID_REQUEST');
  });

  it('같은 실행·같은 형식이 이미 만드는 중이면 409다', async () => {
    await claim(runId, 'XLSX');

    const res = await app.inject({ method: 'POST', url: `/api/runs/${String(runId)}/evidence`, payload: { format: 'XLSX' } });

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('EVIDENCE_BUSY');
  });

  // claim 을 먼저 부르면 외래키 위반이 500으로 새어 나간다. 막는 자리는 claim 앞이다
  it('없는 실행이면 404다', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/runs/999999999/evidence', payload: { format: 'HTML' } });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe('RUN_NOT_FOUND');
  });

  // 화면은 버튼을 잠그지만 API 를 직접 치면 뚫린다. 막는 자리는 서버여야 한다
  it('아직 도는 중인 실행이면 409다', async () => {
    const 도는실행 = await 실행을만든다('RUNNING');

    const res = await app.inject({
      method: 'POST',
      url: `/api/runs/${String(도는실행)}/evidence`,
      payload: { format: 'HTML' },
    });

    expect(res.statusCode).toBe(409);
    expect(res.json().error).toBe('RUN_NOT_FINISHED');
  });

  // 막는 것은 아직 안 끝난 것뿐이다. 사람이 멈춘 실행도 증적을 낼 수 있어야 한다 (SPEC §8.4)
  it('중단된 실행은 증적을 만들 수 있다', async () => {
    const 중단된실행 = await 실행을만든다('ABORTED');

    const res = await app.inject({
      method: 'POST',
      url: `/api/runs/${String(중단된실행)}/evidence`,
      payload: { format: 'HTML' },
    });

    expect(res.statusCode).toBe(200);
    expect(await 끝날때까지(res.json().id)).toMatchObject({ status: 'READY' });
  });

  it('GET /api/evidence/:id — READY 행의 파일을 형식에 맞는 Content-Type으로 내려준다', async () => {
    const 만들기 = (
      await app.inject({ method: 'POST', url: `/api/runs/${String(runId)}/evidence`, payload: { format: 'HTML' } })
    ).json();
    const 문서 = await 끝날때까지(만들기.id);
    expect(문서).toMatchObject({ status: 'READY', error: null });

    const res = await app.inject({ method: 'GET', url: `/api/evidence/${String(만들기.id)}` });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain(제목);
    // 문서에 찍히는 「만든 시각」은 DB가 기억하는 값이다. 생성 중에 새로 재면 둘이 갈린다
    expect(res.body).toContain(만들기.generatedAt);
  });

  it('아직 파일이 없는 행을 받으려 하면 409, 없는 id면 404다', async () => {
    const 만드는중 = await claim(runId, 'PDF');
    expect((await app.inject({ method: 'GET', url: `/api/evidence/${String(만드는중.id)}` })).statusCode).toBe(409);

    await fail(만드는중.id, '증적 문서를 만들지 못했습니다');
    const 실패 = await app.inject({ method: 'GET', url: `/api/evidence/${String(만드는중.id)}` });
    expect(실패.statusCode).toBe(409);
    expect(실패.json().error).toBe('EVIDENCE_NOT_READY');

    const 없음 = await app.inject({ method: 'GET', url: '/api/evidence/999999999' });
    expect(없음.statusCode).toBe(404);
    expect(없음.json().error).toBe('EVIDENCE_NOT_FOUND');
  });
});
