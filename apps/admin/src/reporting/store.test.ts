// 증적 문서를 「만드는 중」으로 붙잡고 닫는 흐름을 본다. CI에는 postgres가 없다. DATABASE_URL이 있을 때만 돈다

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { EvidenceBusyError, claim, fail, findDocument, finish, recoverPending } from './store.js';

const 연결 = process.env.DATABASE_URL;

// 정리 구문이 자기 fixture 만 지우도록 제목을 이 파일 것으로 좁힌다.
// 'XDR%' 로 지우면 routes.test.ts 의 'XDR 증적 라우트 실행' 까지 걸어 간다 (docs/LEARNINGS.md)
const 제목 = 'XDR 증적 상태 실행';

const 실행 = `
  INSERT INTO test_run (title, triggered_by, env, status, service_name, tests_repo, base_url)
  VALUES ($1, 'tester', 'demo', 'FINISHED', '', 'xdr', 'https://xdr.example.com')
  RETURNING run_id`;

describe.skipIf(연결 === undefined)('증적 문서 상태', () => {
  let pool: Pool;
  let runId: number;

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
    const run = await pool.query<{ run_id: string }>(실행, [제목]);
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

  async function 닫힌시각(id: number): Promise<Date | null> {
    const rows = await pool.query<{ finished_at: Date | null }>(
      'SELECT finished_at FROM evidence_document WHERE id = $1',
      [id],
    );
    return rows.rows[0].finished_at;
  }

  // 만드는 도중에 admin 이 죽으면 PENDING 행이 남고, 부분 유일 인덱스가 그 형식을 영영 붙잡는다.
  // 화면은 「만드는 중입니다」로 굳어 사람이 할 수 있는 일이 없어진다 (SPEC §8.4)
  it('recoverPending이 굳은 PENDING을 닫고 같은 형식의 자리를 비운다', async () => {
    // 전역 UPDATE 라 다른 파일이 남긴 PENDING 이 섞이면 건수가 흔들린다. 먼저 비우고 이 파일 것만 센다
    await recoverPending();
    const 굳은것 = await claim(runId, 'PDF');

    const 닫은건수 = await recoverPending();

    expect(닫은건수).toBe(1);
    expect(await findDocument(굳은것.id)).toMatchObject({
      status: 'FAILED',
      error: '만들다 중단됐습니다. 다시 만들어 주세요.',
    });
    expect(await 닫힌시각(굳은것.id)).toBeInstanceOf(Date);

    // 이것이 이 복구의 존재 이유다 — 자리가 나야 「다시 만들기」가 409를 받지 않는다
    const 다시 = await claim(runId, 'PDF');
    expect(다시.status).toBe('PENDING');
  });

  it('recoverPending이 이미 끝난 READY·FAILED는 건드리지 않는다', async () => {
    const 성공 = await claim(runId, 'XLSX');
    await finish(성공.id, '/evidence/XDR-ok.xlsx');
    const 실패 = await claim(runId, 'HTML');
    await fail(실패.id, '스크린샷 파일을 찾지 못했다');

    await recoverPending();

    expect(await findDocument(성공.id)).toMatchObject({
      status: 'READY',
      filePath: '/evidence/XDR-ok.xlsx',
      error: null,
    });
    expect(await findDocument(실패.id)).toMatchObject({
      status: 'FAILED',
      error: '스크린샷 파일을 찾지 못했다',
    });
  });
});
