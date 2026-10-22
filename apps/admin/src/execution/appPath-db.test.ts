// 대상 서버 줄의 앱 파일 경로를 설정이 지키고, 정식 실행이 android 항목에만 싣는지 본다 (러너 §5.2 · 인증 §7 · APP-F1-03 — DATABASE_URL 이 있을 때만)

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 대상서버넣기, 대상서버칸식 } from '../settings/envs.js';
import { createRun } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 번호들 = ['XAP-001', 'XAP-002'];
const 서비스번호 = "(SELECT id FROM service WHERE prefix = 'XAP')";

describe.skipIf(연결 === undefined)('대상 서버 앱 파일 경로', () => {
  let pool: Pool;
  let 서비스: number;

  async function 치운다(): Promise<void> {
    await pool.query(`DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ${서비스번호})`);
    await pool.query(`DELETE FROM test_run WHERE service_id = ${서비스번호}`);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await pool.query(`DELETE FROM service_env WHERE service_id = ${서비스번호}`);
    await pool.query("DELETE FROM service WHERE prefix = 'XAP'");
  }

  async function 저장(줄: Parameters<typeof 대상서버넣기>[2][number]): Promise<void> {
    const client = await pool.connect();
    try {
      await 대상서버넣기(client, 서비스, [줄]);
    } finally {
      client.release();
    }
  }

  const 읽기 = async (): Promise<unknown> =>
    (await pool.query(`SELECT ${대상서버칸식} AS j FROM service_env e WHERE e.service_id = $1`, [서비스])).rows[0]?.j.appPath;

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치운다();
    서비스 = Number(
      (
        await pool.query(
          `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
           VALUES ('XAP', 'XAP 서비스', '#445566', 'https://xap.example.com', 'xap') RETURNING id`,
        )
      ).rows[0].id,
    );
    for (const [tcId, platforms] of [['XAP-001', '["android"]'], ['XAP-002', '["desktop"]']]) {
      await pool.query(
        `INSERT INTO test_case (tc_id, name, platforms, precondition, file_path, param_schema, expected_schema)
         VALUES ($1, $1, $2, '[]', 'xap/x.spec.ts', '{"type":"object","properties":{}}', '{"type":"object","properties":{}}')`,
        [tcId, platforms],
      );
    }
  });

  afterAll(async () => {
    await 치운다();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('저장은 앞뒤 공백을 떼고, 키를 안 보내면 지키고, 빈 글자면 지운다', async () => {
    await 저장({ env: 'qa', baseUrl: 'https://qa.example.com', appPath: ' /apk/qa.apk ' });
    const 처음 = await 읽기();
    await 저장({ env: 'qa', baseUrl: 'https://qa.example.com' });
    const 안보냄 = await 읽기();
    await 저장({ env: 'qa', baseUrl: 'https://qa.example.com', appPath: '' });
    expect([처음, 안보냄, await 읽기()]).toEqual(['/apk/qa.apk', '/apk/qa.apk', null]);
  });

  it('정식 실행은 android 항목에만 그 대상 서버의 앱 경로를 싣는다', async () => {
    await 저장({ env: 'qa', baseUrl: 'https://qa.example.com', appPath: '/apk/qa.apk' });
    const { items } = await createRun({
      origin: 'MANUAL',
      triggeredBy: 'tester',
      env: 'qa',
      items: [
        { tcId: 'XAP-001', platforms: ['android'], params: {}, expected: {} },
        { tcId: 'XAP-002', platforms: ['desktop'], params: {}, expected: {} },
      ],
    });
    expect(items.map((i) => [i.tcId, i.app])).toEqual([['XAP-001', '/apk/qa.apk'], ['XAP-002', undefined]]);
  });

  it('게임 애플리케이션이면 android 항목에만 엔진 GAME 을 싣고, 아니면 엔진 칸이 없다', async () => {
    await 저장({ env: 'qa', baseUrl: 'https://qa.example.com', appPath: '/apk/qa.apk' });
    const 만든다 = async () =>
      (
        await createRun({
          origin: 'MANUAL',
          triggeredBy: 'tester',
          env: 'qa',
          items: [
            { tcId: 'XAP-001', platforms: ['android'], params: {}, expected: {} },
            { tcId: 'XAP-002', platforms: ['desktop'], params: {}, expected: {} },
          ],
        })
      ).items.map((i) => i.engine);
    expect(await 만든다()).toEqual([undefined, undefined]);
    await pool.query("UPDATE service SET kind = 'GAME' WHERE id = $1", [서비스]);
    try {
      expect(await 만든다()).toEqual(['GAME', undefined]);
    } finally {
      await pool.query("UPDATE service SET kind = 'SCREEN' WHERE id = $1", [서비스]);
    }
  });

  it('앱 경로가 빈 줄이면 싣지 않는다 — 러너가 자기 환경값을 쓴다', async () => {
    await 저장({ env: 'qa', baseUrl: 'https://qa.example.com', appPath: null });
    const { items } = await createRun({
      origin: 'MANUAL',
      triggeredBy: 'tester',
      env: 'qa',
      items: [{ tcId: 'XAP-001', platforms: ['android'], params: {}, expected: {} }],
    });
    expect('app' in items[0]!).toBe(false);
  });
});
