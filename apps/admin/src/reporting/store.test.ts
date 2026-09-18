// 증적 문서를 「만드는 중」으로 붙잡고 닫는 흐름을 본다. CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { EvidenceBusyError, claim, fail, findDocument, finish } from './store.js';

const 연결 = process.env.DATABASE_URL;

const 실행 = `
  INSERT INTO test_run (title, triggered_by, env, status, service_name, tests_repo, base_url)
  VALUES ('XDR 증적 대상 실행', 'tester', 'demo', 'FINISHED', '', 'xdr', 'https://xdr.example.com')
  RETURNING run_id`;

describe.skipIf(연결 === undefined)('증적 문서 상태', () => {
  let pool: Pool;
  let runId: number;

  async function 치운다(): Promise<void> {
    await pool.query(
      "DELETE FROM evidence_document WHERE run_id IN (SELECT run_id FROM test_run WHERE title LIKE 'XDR%')",
    );
  }

  async function 실행까지치운다(): Promise<void> {
    await 치운다();
    await pool.query("DELETE FROM test_run WHERE title LIKE 'XDR%'");
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 실행까지치운다();
    const run = await pool.query<{ run_id: string }>(실행);
    runId = Number(run.rows[0].run_id);
  });

  afterAll(async () => {
    await 실행까지치운다();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  beforeEach(치운다);

  it('claim이 PENDING 행을 만든다', async () => {
    const 문서 = await claim(runId, 'PDF');

    expect(문서).toMatchObject({ runId, format: 'PDF', status: 'PENDING', filePath: null, error: null });
    expect(await findDocument(문서.id)).toMatchObject({ id: 문서.id, status: 'PENDING' });
  });

  it('만드는 중에 같은 형식을 또 claim하면 EvidenceBusyError가 난다', async () => {
    await claim(runId, 'PDF');

    await expect(claim(runId, 'PDF')).rejects.toBeInstanceOf(EvidenceBusyError);
  });

  it('finish가 READY와 파일 경로로 닫는다', async () => {
    const 문서 = await claim(runId, 'XLSX');

    await finish(문서.id, '/evidence/XDR-1.xlsx');

    expect(await findDocument(문서.id)).toMatchObject({
      status: 'READY',
      filePath: '/evidence/XDR-1.xlsx',
      error: null,
    });
  });

  it('fail이 FAILED와 사람이 읽을 한 문장으로 닫는다', async () => {
    const 문서 = await claim(runId, 'HTML');

    await fail(문서.id, '스크린샷 파일을 찾지 못했다');

    expect(await findDocument(문서.id)).toMatchObject({
      status: 'FAILED',
      filePath: null,
      error: '스크린샷 파일을 찾지 못했다',
    });
  });

  // 실패한 문서가 형식을 계속 붙잡고 있으면 화면의 「다시 만들기」 버튼이 영원히 409를 받는다
  it('FAILED 뒤에는 같은 형식을 다시 claim할 수 있다', async () => {
    const 첫번째 = await claim(runId, 'PDF');
    await fail(첫번째.id, '러너가 응답하지 않았다');

    const 두번째 = await claim(runId, 'PDF');

    expect(두번째.id).not.toBe(첫번째.id);
    expect(두번째.status).toBe('PENDING');
  });
});
