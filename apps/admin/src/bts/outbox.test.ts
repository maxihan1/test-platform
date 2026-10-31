// 보낼 줄 — 넣기 · 보내기 · 1분 간격 5번 · 4xx 바로 멈춤 · 408/429 다시 · 연결 없으면 멈춤 (도메인/BTS 결정 17). DATABASE_URL 이 있을 때만 돈다

import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { BTS응답, BTS자리 } from './client.js';
import { 보낼줄넣기, 보낼줄점검, 최대횟수 } from './outbox.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XBY';

describe.skipIf(연결 === undefined)('BTS 보낼 줄', () => {
  let 프로젝트 = 0;
  let 남의프로젝트 = 0;
  let 서비스 = 0;
  let 남의서비스 = 0;
  const 부른것: { 자리: BTS자리; method: string; 경로: string; 몸: unknown }[] = [];
  let 답: (경로: string) => BTS응답 | Error = () => ({ status: 201, json: { data: { key: 'XBY-1' } } });
  const 부르기 = async (자리: BTS자리, method: string, 경로: string, 몸?: unknown): Promise<BTS응답> => {
    부른것.push({ 자리, method, 경로, 몸 });
    const r = 답(경로);
    if (r instanceof Error) throw r;
    return r;
  };
  const pool = async () => (await import('../db/index.js')).pool;
  const 줄 = async (id: number) =>
    (await (await pool()).query('SELECT state, tries, issue_key, last_error FROM bts_outbox WHERE id = $1', [id])).rows[0];
  // 다음 점검을 기다리지 않고 바로 때가 되게
  const 때되게 = async () => (await pool()).query('UPDATE bts_outbox SET next_at = now() WHERE project_id = ANY($1)', [[프로젝트, 남의프로젝트]]);

  beforeAll(async () => {
    const p = await pool();
    const 만들기 = async (이름: string, 접: string): Promise<[number, number]> => {
      const pid = Number((await p.query<{ id: string }>('INSERT INTO project (name) VALUES ($1) RETURNING id', [이름])).rows[0]!.id);
      const sid = Number(
        (
          await p.query<{ id: string }>(
            `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, project_id) VALUES ($1, $1, '#112233', '', $2, $3) RETURNING id`,
            [접, 접.toLowerCase(), pid],
          )
        ).rows[0]!.id,
      );
      return [pid, sid];
    };
    [프로젝트, 서비스] = await 만들기(`${접두사} 프로젝트`, 접두사);
    [남의프로젝트, 남의서비스] = await 만들기(`${접두사}B 프로젝트`, `${접두사}B`);
    await p.query(
      `INSERT INTO bts_link (project_id, base_url, bts_project, bot_key, webhook_secret, status_map, resolution_map, updated_by)
       VALUES ($1, 'https://bts.example.com', 'XBY', 'pat_xby', 's', '{}', '{}', 'xby')`,
      [프로젝트],
    );
  });

  beforeEach(async () => {
    부른것.length = 0;
    // 앞 검사가 남긴 기다리는 줄을 치운다 — 검사마다 자기가 넣은 줄만 보내게
    await (await pool()).query("UPDATE bts_outbox SET state = 'SENT' WHERE project_id = ANY($1)", [[프로젝트, 남의프로젝트]]);
  });

  afterAll(async () => {
    const p = await pool();
    // bts_outbox · bts_link 는 project 와 같이 지워진다
    await p.query('DELETE FROM service WHERE id = ANY($1)', [[서비스, 남의서비스]]);
    await p.query('DELETE FROM project WHERE id = ANY($1)', [[프로젝트, 남의프로젝트]]);
  });

  it('CREATE 를 보내면 받은 이슈 키를 적는다 · 같은 테스트 · 대상 서버에 기다리는 등록은 하나다', async () => {
    const id = await 보낼줄넣기({ projectId: 프로젝트, kind: 'CREATE', payload: { summary: '실패' }, serviceId: 서비스, tcId: 'XBY-001', env: 'qa' });
    expect(id).not.toBeNull();
    expect(await 보낼줄넣기({ projectId: 프로젝트, kind: 'CREATE', payload: {}, serviceId: 서비스, tcId: 'XBY-001', env: 'qa' })).toBeNull();
    expect(await 보낼줄점검(부르기)).toEqual({ 보냄: 1, 다시: 0, 멈춤: 0 });
    expect(부른것).toEqual([{ 자리: { baseUrl: 'https://bts.example.com', botKey: 'pat_xby' }, method: 'POST', 경로: '/api/v1/issues', 몸: { summary: '실패' } }]);
    expect(await 줄(id!)).toEqual({ state: 'SENT', tries: 1, issue_key: 'XBY-1', last_error: null });
  });

  it('BTS 가 꺼져 있으면 1분 뒤 다시 · 5번째에 그만둔다', async () => {
    답 = () => new Error('connect ECONNREFUSED');
    const id = (await 보낼줄넣기({ projectId: 프로젝트, kind: 'COMMENT', issueKey: 'XBY-1', payload: { body: '또 실패' } }))!;
    expect(await 보낼줄점검(부르기)).toEqual({ 보냄: 0, 다시: 1, 멈춤: 0 });
    expect(부른것.at(-1)?.경로).toBe('/api/v1/issues/XBY-1/comments');
    // 1분이 안 지났으면 안 집는다
    expect(await 보낼줄점검(부르기)).toEqual({ 보냄: 0, 다시: 0, 멈춤: 0 });
    for (let i = 2; i < 최대횟수; i++) {
      await 때되게();
      expect((await 보낼줄점검(부르기)).다시).toBe(1);
    }
    await 때되게();
    expect((await 보낼줄점검(부르기)).멈춤).toBe(1);
    const 끝 = await 줄(id);
    expect([끝.state, 끝.tries]).toEqual(['GAVE_UP', 최대횟수]);
    expect(끝.last_error).toContain('5번 보내고 그만뒀습니다');
  });

  it('권한 오류는 바로 멈추고 까닭을 남긴다 · 429 는 다시 보낸다', async () => {
    답 = () => ({ status: 403, json: null });
    const 권한 = (await 보낼줄넣기({ projectId: 프로젝트, kind: 'TRANSITION', issueKey: 'XBY-1', payload: { toStatusKey: 'closed' } }))!;
    expect(await 보낼줄점검(부르기)).toEqual({ 보냄: 0, 다시: 0, 멈춤: 1 });
    expect(await 줄(권한)).toMatchObject({ state: 'GAVE_UP', tries: 1, last_error: '권한 없음 — QA Hub AI 열쇠를 확인하세요 (403)' });

    답 = () => ({ status: 429, json: null });
    const 바쁨 = (await 보낼줄넣기({ projectId: 프로젝트, kind: 'ASSIGN', issueKey: 'XBY-1', payload: { assigneeId: 'u' } }))!;
    expect(await 보낼줄점검(부르기)).toEqual({ 보냄: 0, 다시: 1, 멈춤: 0 });
    expect(부른것.at(-1)).toMatchObject({ method: 'PATCH', 경로: '/api/v1/issues/XBY-1/assignee' });
    expect(await 줄(바쁨)).toMatchObject({ state: 'PENDING', tries: 1 });
    답 = () => ({ status: 200, json: {} });
    await 때되게();
    expect(await 보낼줄점검(부르기)).toEqual({ 보냄: 1, 다시: 0, 멈춤: 0 });
  });

  it('이슈 키 없는 만들기 답 · 주소 넘김(3xx)은 바로 멈춘다 · CREATE 는 테스트 · 대상 서버 칸이 꼭 있다', async () => {
    답 = () => ({ status: 201, json: {} });
    const 키없음 = (await 보낼줄넣기({ projectId: 프로젝트, kind: 'CREATE', payload: {}, serviceId: 서비스, tcId: 'XBY-002', env: 'qa' }))!;
    expect(await 보낼줄점검(부르기)).toEqual({ 보냄: 0, 다시: 0, 멈춤: 1 });
    expect(await 줄(키없음)).toMatchObject({ state: 'GAVE_UP', last_error: 'BTS 응답에 이슈 키가 없습니다 (201)' });
    답 = () => ({ status: 301, json: null });
    const 넘김 = (await 보낼줄넣기({ projectId: 프로젝트, kind: 'COMMENT', issueKey: 'XBY-1', payload: {} }))!;
    expect(await 보낼줄점검(부르기)).toEqual({ 보냄: 0, 다시: 0, 멈춤: 1 });
    expect((await 줄(넘김)).last_error).toContain('BTS 주소');
    await expect(보낼줄넣기({ projectId: 프로젝트, kind: 'CREATE', payload: {}, serviceId: 서비스, tcId: 'XBY-003' })).rejects.toThrow();
  });

  it('같은 이슈는 앞 줄이 끝나야 뒤 줄을 보낸다', async () => {
    답 = () => ({ status: 429, json: null });
    const 앞 = (await 보낼줄넣기({ projectId: 프로젝트, kind: 'TRANSITION', issueKey: 'XBY-5', payload: { toStatusKey: 'a', expectedVersion: 1 } }))!;
    const 뒤 = (await 보낼줄넣기({ projectId: 프로젝트, kind: 'TRANSITION', issueKey: 'XBY-5', payload: { toStatusKey: 'b', expectedVersion: 2 } }))!;
    expect(await 보낼줄점검(부르기)).toEqual({ 보냄: 0, 다시: 1, 멈춤: 0 });
    expect(부른것.map((b) => b.몸)).toEqual([{ toStatusKey: 'a', expectedVersion: 1 }]);
    답 = () => ({ status: 200, json: {} });
    await 때되게();
    expect(await 보낼줄점검(부르기)).toEqual({ 보냄: 1, 다시: 0, 멈춤: 0 });
    await 때되게();
    expect(await 보낼줄점검(부르기)).toEqual({ 보냄: 1, 다시: 0, 멈춤: 0 });
    expect(부른것.map((b) => b.몸).slice(1)).toEqual([{ toStatusKey: 'a', expectedVersion: 1 }, { toStatusKey: 'b', expectedVersion: 2 }]);
    expect([(await 줄(앞)).state, (await 줄(뒤)).state]).toEqual(['SENT', 'SENT']);
  });

  it('판 번호 없는 옮기기 — 보내기 직전에 판을 읽고, 그사이 판이 바뀌면(409) 다시 보내고, 이미 그 상태면 실은 댓글만 단다', async () => {
    let 판 = 3;
    let 상태 = 'qa-req';
    답 = (경로) => (경로.endsWith('/transition') ? { status: 판 === 3 ? 409 : 200, json: {} } : { status: 200, json: { data: { version: 판, currentStateKey: 상태 } } });
    const 닫기 = (await 보낼줄넣기({ projectId: 프로젝트, kind: 'TRANSITION', issueKey: 'XBY-8', payload: { toStatusKey: 'closed', comment: '재검증 통과' } }))!;
    expect(await 보낼줄점검(부르기)).toEqual({ 보냄: 0, 다시: 1, 멈춤: 0 });
    판 = 4;
    await 때되게();
    expect(await 보낼줄점검(부르기)).toEqual({ 보냄: 1, 다시: 0, 멈춤: 0 });
    expect(부른것.filter((b) => b.경로.endsWith('/transition')).map((b) => b.몸)).toEqual([
      { toStatusKey: 'closed', comment: '재검증 통과', expectedVersion: 3 },
      { toStatusKey: 'closed', comment: '재검증 통과', expectedVersion: 4 },
    ]);
    expect((await 줄(닫기)).state).toBe('SENT');

    부른것.length = 0;
    상태 = 'closed';
    await 보낼줄넣기({ projectId: 프로젝트, kind: 'TRANSITION', issueKey: 'XBY-9', payload: { toStatusKey: 'closed', comment: '재검증 통과' } });
    expect(await 보낼줄점검(부르기)).toEqual({ 보냄: 1, 다시: 0, 멈춤: 0 });
    expect(부른것.map((b) => [b.method, b.경로, b.몸])).toEqual([
      ['GET', '/api/v1/issues/XBY-9', undefined],
      ['POST', '/api/v1/issues/XBY-9/comments', { body: '재검증 통과' }],
    ]);
  });

  it('등록이 닿으면 짝을 적고 「QA 검토」로 옮기고 캡처를 올린다 · 첨부 목록은 BTS 몸에 안 싣는다', async () => {
    const p = await pool();
    const 폴더 = await realpath(await mkdtemp(join(tmpdir(), 'xby-')));
    const 앞폴더 = process.env.PLATFORM_ARTIFACTS_DIR;
    process.env.PLATFORM_ARTIFACTS_DIR = 폴더;
    await mkdir(join(폴더, 'runs', '7', '8'), { recursive: true });
    await writeFile(join(폴더, 'runs', '7', '8', '2.png'), 'png');
    await p.query(`UPDATE bts_link SET status_map = '{"QA_REVIEW": "qa_review"}' WHERE project_id = $1`, [프로젝트]);
    const 올린것: { key: string; 이름: string; 글: string }[] = [];
    try {
      답 = (경로) =>
        경로 === '/api/v1/issues'
          ? { status: 201, json: { data: { key: 'XBY-9', version: 3, currentStateKey: 'open' } } }
          : { status: 200, json: {} };
      const id = (await 보낼줄넣기({
        projectId: 프로젝트,
        kind: 'CREATE',
        payload: { summary: '실패', attachments: ['runs/7/8/2.png'] },
        serviceId: 서비스,
        tcId: 'XBY-010',
        env: 'qa',
      }))!;
      const 올리기 = async (_자리: BTS자리, key: string, 이름: string, 파일: Buffer) => {
        올린것.push({ key, 이름, 글: 파일.toString() });
        return 201;
      };
      expect(await 보낼줄점검(부르기, 올리기)).toEqual({ 보냄: 1, 다시: 0, 멈춤: 0 });
      expect(부른것.map((b) => [b.경로, b.몸])).toEqual([
        ['/api/v1/issues', { summary: '실패' }],
        ['/api/v1/issues/XBY-9/transition', { toStatusKey: 'qa_review', expectedVersion: 3 }],
      ]);
      expect(올린것).toEqual([{ key: 'XBY-9', 이름: 'runs-7-8-2.png', 글: 'png' }]);
      expect((await 줄(id)).state).toBe('SENT');
      const 짝 = await p.query('SELECT issue_key, env, closed_at FROM bts_issue_case WHERE service_id = $1 AND tc_id = $2', [서비스, 'XBY-010']);
      expect(짝.rows).toEqual([{ issue_key: 'XBY-9', env: 'qa', closed_at: null }]);
    } finally {
      await p.query(`UPDATE bts_link SET status_map = '{}' WHERE project_id = $1`, [프로젝트]);
      process.env.PLATFORM_ARTIFACTS_DIR = 앞폴더;
      if (앞폴더 === undefined) delete process.env.PLATFORM_ARTIFACTS_DIR;
      await rm(폴더, { recursive: true, force: true });
    }
  });

  it('BTS 연결이 없는 프로젝트 줄은 부르지 않고 멈춘다', async () => {
    const id = (await 보낼줄넣기({ projectId: 남의프로젝트, kind: 'COMMENT', issueKey: 'DM-1', payload: {} }))!;
    expect(await 보낼줄점검(부르기)).toEqual({ 보냄: 0, 다시: 0, 멈춤: 1 });
    expect(부른것).toEqual([]);
    expect(await 줄(id)).toMatchObject({ state: 'GAVE_UP', last_error: 'BTS 연결이 없습니다' });
  });
});
