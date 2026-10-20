// 응답 모양 확인의 서버 쪽 — 케이스 판 싣기 · 받은 API 갈아 끼우기 · 실행 시작 때 문서 견주기를 본다 (도메인/API §3.8 · API-F1-05 — DATABASE_URL 이 있을 때만)

import { type Server, createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import type { CaseSpec, ExecuteResponse } from '@platform/kit';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { save } from '../catalog/store.js';
import { createRun, finishItem } from '../execution/store.js';

import { 케이스판 } from './caseDoc.js';
import { 실행문서견주기 } from './runCompare.js';
import { 판올리기 } from './store.js';

const 연결 = process.env.DATABASE_URL;
const 번호들 = ['XAS-FN-001', 'XAS-FN-002', 'XASS-FN-001'];

const 문서 = (판: string) => ({
  openapi: '3.1.0',
  info: { title: '알림', version: 판 },
  paths: { '/v1/pushes': { post: { responses: { '201': { description: '됨' } } } } },
});

const 명세 = (tcId: string, apiDoc?: number): CaseSpec => ({
  tcId,
  name: `${tcId} 케이스`,
  platforms: ['desktop'],
  precondition: [],
  paramSchema: { type: 'object', properties: {} },
  expectedSchema: { type: 'object', properties: {} },
  filePath: `xas/${tcId}.spec.ts`,
  ...(apiDoc !== undefined && { apiDoc }),
});

describe.skipIf(연결 === undefined)('응답 모양 확인 — 서버 쪽', { timeout: 30_000 }, () => {
  let pool: Pool;
  let 문서서버: Server;
  let 서비스 = 0;
  let 내줄것: { 코드: number; 글: string } = { 코드: 200, 글: '' };

  const 치운다 = async () => {
    const ids = (await pool.query<{ id: string }>("SELECT id FROM service WHERE prefix IN ('XAS', 'XASS')")).rows.map((r) => r.id);
    await pool.query('DELETE FROM api_call_seen WHERE service_id = ANY($1)', [ids]);
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [ids]);
    await pool.query('DELETE FROM test_run WHERE service_id = ANY($1)', [ids]);
    await pool.query('DELETE FROM api_doc_version WHERE service_id = ANY($1)', [ids]);
    await pool.query('DELETE FROM test_case WHERE tc_id = ANY($1)', [번호들]);
    await pool.query('DELETE FROM service_env WHERE service_id = ANY($1)', [ids]);
    await pool.query("DELETE FROM service WHERE prefix IN ('XAS', 'XASS')");
  };

  const 실행 = async (env: string, tcId = 'XAS-FN-001') =>
    createRun({ origin: 'MANUAL', triggeredBy: 'tester', env, items: [{ tcId, platforms: ['desktop'], params: {}, expected: {} }] });

  const 받은줄 = async () =>
    (
      await pool.query<{ method: string; path: string; status: number; no_shape: boolean }>(
        'SELECT method, path, status, no_shape FROM api_call_seen WHERE service_id = $1 ORDER BY status',
        [서비스],
      )
    ).rows;

  const 실행머리 = async (runId: number) =>
    (await pool.query<{ api_doc_version: number | null; api_doc_note: string | null }>('SELECT api_doc_version, api_doc_note FROM test_run WHERE run_id = $1', [runId])).rows[0];

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치운다();
    문서서버 = createServer((_req, res) => {
      res.writeHead(내줄것.코드, { 'content-type': 'application/json' });
      res.end(내줄것.글);
    });
    await new Promise<void>((r) => 문서서버.listen(0, '127.0.0.1', r));
    const 주소 = `http://127.0.0.1:${String((문서서버.address() as AddressInfo).port)}/`;
    const s = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind, api_doc_path, api_doc_env)
       VALUES ('XAS', 'XAS 알림 서버', '#445566', '', 'xas', 'API', '/openapi.json', 'stg') RETURNING id`,
    );
    서비스 = Number(s.rows[0]!.id);
    await pool.query("INSERT INTO service_env (service_id, env, base_url) VALUES ($1, 'stg', $2), ($1, 'prod', $2)", [서비스, 주소]);
    await pool.query("INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ('XASS', 'XASS 화면', '#445566', '', 'xass')");
    await save([명세('XAS-FN-001', 1), 명세('XAS-FN-002')], false, 'XAS');
    await save([명세('XASS-FN-001')], false, 'XASS');
  });

  afterAll(async () => {
    await 치운다();
    await new Promise((r) => 문서서버.close(r));
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('스캐너가 케이스 머리 apiDoc 을 test_case.api_doc 에 담는다 — 없으면 비운다', async () => {
    const r = await pool.query<{ tc_id: string; api_doc: number | null }>('SELECT tc_id, api_doc FROM test_case WHERE tc_id = ANY($1) ORDER BY tc_id', [번호들]);
    expect(r.rows.map((x) => [x.tc_id, x.api_doc])).toEqual([
      ['XAS-FN-001', 1],
      ['XAS-FN-002', null],
      ['XASS-FN-001', null],
    ]);
  });

  it('케이스판 — 화면 애플리케이션은 빈 객체, 판이 안 적혔거나 없으면 미실행 사유, 있으면 원문', async () => {
    expect(await 케이스판('XAS-FN-001')).toEqual({ 사유: 'API 문서 판 1 가 없습니다' });
    await 판올리기(서비스, 문서('1'), { source: 'FILE', fileName: null }, null);

    expect(await 케이스판('XASS-FN-001')).toEqual({});
    expect(await 케이스판('XAS-FN-002')).toEqual({ 사유: '케이스에 API 문서 판이 적혀 있지 않습니다' });
    // 없는 판은 담아 두지 않는다 — 방금 올린 판 1 을 읽는다
    expect(await 케이스판('XAS-FN-001')).toEqual({ apiDoc: { version: 1, doc: 문서('1') } });
  });

  it('통과 항목은 그 케이스 줄을 받은 API 로 갈아 끼우고, 실패는 지우고, 미실행은 그대로 둔다', async () => {
    await pool.query(
      "INSERT INTO api_call_seen (service_id, tc_id, method, path, status, run_id) VALUES ($1, 'XAS-FN-001', 'GET', '/v1/old', 200, 1)",
      [서비스],
    );
    const 끝낸다 = async (status: ExecuteResponse['status']) => {
      const { items } = await 실행('stg');
      const historyId = items[0]!.historyId;
      await finishItem(historyId, {
        historyId,
        status,
        durationMs: 1,
        steps: [
          {
            seq: 1, title: '푸시를 보낸다', status: 'PASS', durationMs: 1, assertions: [],
            shapeChecks: [
              { method: 'POST', path: '/v1/pushes', status: 201, result: 'PASS' },
              { method: 'POST', path: '/v1/pushes', status: 400, result: 'NO_SHAPE' },
              { method: 'POST', path: '/v1/pushes', status: 201, result: 'PASS' },
            ],
          },
        ],
      });
    };

    await 끝낸다('PASS');
    expect(await 받은줄()).toEqual([
      { method: 'POST', path: '/v1/pushes', status: 201, no_shape: false },
      { method: 'POST', path: '/v1/pushes', status: 400, no_shape: true },
    ]);
    await 끝낸다('NA');
    expect(await 받은줄()).toHaveLength(2);
    await 끝낸다('FAIL');
    expect(await 받은줄()).toEqual([]);
  });

  it('기준 서버 실행은 문서가 다르면 판을 올리고 그 판 번호를 실행에 박제한다', async () => {
    내줄것 = { 코드: 200, 글: JSON.stringify(문서('2')) };
    const { runId } = await 실행('stg');
    await 실행문서견주기(runId);

    expect(await 실행머리(runId)).toEqual({ api_doc_version: 2, api_doc_note: null });
    const 판 = await pool.query('SELECT source, env, created_by FROM api_doc_version WHERE service_id = $1 AND version = 2', [서비스]);
    expect(판.rows).toEqual([{ source: 'URL', env: 'stg', created_by: 'tester' }]);
  });

  it('다른 서버는 판을 안 올리고 다를 때만 DIFFERS 를 남긴다', async () => {
    내줄것 = { 코드: 200, 글: JSON.stringify(문서('3')) };
    const 다름 = await 실행('prod');
    await 실행문서견주기(다름.runId);
    expect(await 실행머리(다름.runId)).toEqual({ api_doc_version: 2, api_doc_note: 'DIFFERS' });

    // 키 차례 · 들여쓰기만 다르면 같은 판이다
    내줄것 = { 코드: 200, 글: JSON.stringify({ paths: 문서('2').paths, info: 문서('2').info, openapi: '3.1.0' }, null, 2) };
    const 같음 = await 실행('prod');
    await 실행문서견주기(같음.runId);
    expect(await 실행머리(같음.runId)).toEqual({ api_doc_version: 2, api_doc_note: null });
  });

  it('못 받았거나 OpenAPI 문서가 아니면 FETCH_FAILED — 판은 그대로다', async () => {
    for (const 줄것 of [{ 코드: 500, 글: '' }, { 코드: 200, 글: '{"swagger":"2.0"}' }]) {
      내줄것 = 줄것;
      const { runId } = await 실행('stg');
      await 실행문서견주기(runId);
      expect(await 실행머리(runId)).toEqual({ api_doc_version: 2, api_doc_note: 'FETCH_FAILED' });
    }
  });

  it('화면 애플리케이션 실행은 견주지 않는다', async () => {
    await pool.query("INSERT INTO service_env (service_id, env, base_url) SELECT id, 'stg', 'http://127.0.0.1:9' FROM service WHERE prefix = 'XASS'");
    const { runId } = await 실행('stg', 'XASS-FN-001');
    await 실행문서견주기(runId);
    expect(await 실행머리(runId)).toEqual({ api_doc_version: null, api_doc_note: null });
  });
});
