// 실행 결과 화면의 실패 케이스 카드 질의 검사 — 확정 실패만 · 비밀값 가림 · 최근 흐름 · 변화 · 디바이스 거르기 · 회차 (도메인/리포팅 §7)
// CI에는 postgres가 없을 수 있다. 실접속 검사는 DATABASE_URL이 있을 때만 돈다

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { findItem } from '../execution/queries.js';
import { 실패카드 } from './failures.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('실패 카드 질의', () => {
  let pool: Pool;
  let 서비스 = 0;
  const 실행번호: Record<string, number> = {};
  const 항목번호: Record<string, number> = {};

  async function 치우기(): Promise<void> {
    const 서비스들 = (await pool.query<{ id: string }>(`SELECT id FROM service WHERE prefix = 'XFC'`)).rows.map((r) =>
      Number(r.id),
    );
    if (서비스들.length === 0) return;
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [서비스들]);
    await pool.query('DELETE FROM test_run WHERE service_id = ANY($1)', [서비스들]);
    await pool.query('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = ANY($1))', [서비스들]);
    await pool.query('DELETE FROM scenario WHERE service_id = ANY($1)', [서비스들]);
    await pool.query('DELETE FROM service WHERE id = ANY($1)', [서비스들]);
  }

  async function 실행(
    이름: string,
    옵션: { env?: string; kind?: string; status?: string; 시간전: number; 시나리오?: [number, number] },
  ): Promise<number> {
    const { env = 'qa', kind = 'UI', status = 'FINISHED', 시간전, 시나리오 } = 옵션;
    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url,
                             kind, scenario_id, scenario_version, started_at, finished_at)
       VALUES ($1, 'xfc', $2, $3, $4, 'XFC 마켓', '', '', $5, $6, $7,
               now() - $8::double precision * interval '1 hour',
               CASE WHEN $3 = 'RUNNING' THEN NULL ELSE now() - $8::double precision * interval '1 hour' + interval '5 minutes' END)
       RETURNING run_id`,
      [이름, env, status, 서비스, kind, 시나리오?.[0] ?? null, 시나리오?.[1] ?? null, 시간전],
    );
    실행번호[이름] = Number(r.rows[0]!.run_id);
    return 실행번호[이름];
  }

  async function 항목(
    runId: number,
    키: string,
    tcId: string,
    status: string,
    옵션: {
      attempt?: number;
      platform?: string;
      미확정?: boolean;
      오류?: string;
      검증문장?: string;
      비밀?: boolean;
    } = {},
  ): Promise<void> {
    const { attempt = 1, platform = 'desktop', 미확정 = false, 오류, 검증문장, 비밀 = false } = 옵션;
    const r = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                             precondition, params, expected, param_schema, expected_schema,
                             status, duration_ms, error, unconfirmed, finished_at)
       VALUES ($1, $2, $3, $4, $5, $6, 300000, '["로그인한 상태다"]', $7, $8, $9, $10, $11, 100, $12, $13, now())
       RETURNING history_id`,
      [
        runId,
        tcId,
        platform,
        attempt,
        `${tcId} 케이스`,
        `xfc/${tcId}.spec.ts`,
        JSON.stringify(비밀 ? { username: 'xfc-user', password: 'SECRET-PW' } : {}),
        JSON.stringify(비밀 ? { token: 'SECRET-TOKEN', count: 2 } : {}),
        JSON.stringify(비밀 ? { properties: { password: { type: 'string', secret: true } } } : {}),
        JSON.stringify(비밀 ? { properties: { token: { type: 'string', secret: true }, count: { type: 'number' } } } : {}),
        status,
        오류 === undefined ? null : JSON.stringify({ message: 오류 }),
        미확정 ? '화면에서 본 값' : null,
      ],
    );
    const historyId = Number(r.rows[0]!.history_id);
    항목번호[`${키}|${tcId}|${platform}|${attempt}`] = historyId;
    if (검증문장 !== undefined) {
      await pool.query(
        `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions) VALUES ($1, 1, '화면을 연다', 'PASS', 10, '[]')`,
        [historyId],
      );
      await pool.query(
        `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions, line, screenshot_path)
         VALUES ($1, 2, '할 일 목록을 센다', 'FAIL', 10, $2, 12, $3)`,
        [
          historyId,
          JSON.stringify([{ statement: 검증문장, status: 'FAIL', actual: 1, expected: 2 }]),
          `/shots/xfc-${historyId}.png`,
        ],
      );
    }
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치우기();
    const s = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ('XFC', 'XFC 마켓', '#445566', '', 'xfc') RETURNING id`,
    );
    서비스 = Number(s.rows[0]!.id);
    const 시나리오 = await pool.query<{ id: string }>(
      `INSERT INTO scenario (service_id, name, created_by) VALUES ($1, 'XFC 주문 흐름', 'xfc') RETURNING id`,
      [서비스],
    );
    const 시나리오번호 = Number(시나리오.rows[0]!.id);
    await pool.query(
      `INSERT INTO scenario_version (scenario_id, version, parts, saved_by, saved_by_name) VALUES ($1, 1, '[]', 'xfc', '검사')`,
      [시나리오번호],
    );

    const 개수문장 = '목록에 보이는 할 일 개수가 기대와 같다';
    const RO = await 실행('XFC RO 옛 통과', { 시간전: 12 });
    await 항목(RO, 'RO', 'XFC-001', 'PASS');
    const RA = await 실행('XFC RA 실패', { 시간전: 10 });
    await 항목(RA, 'RA', 'XFC-001', 'FAIL');
    const RU = await 실행('XFC RU 미확정만', { 시간전: 9 });
    await 항목(RU, 'RU', 'XFC-001', 'FAIL', { 미확정: true });
    const RB = await 실행('XFC RB 중단', { status: 'STOPPED', 시간전: 8 });
    await 항목(RB, 'RB', 'XFC-001', 'FAIL', { attempt: 1 });
    await 항목(RB, 'RB', 'XFC-001', 'PASS', { attempt: 2 });
    await 항목(RB, 'RB', 'XFC-001', 'PASS', { platform: 'mobile' });
    await 항목(RB, 'RB', 'XFC-002', 'PASS', { platform: 'mobile' });

    const 스테이지 = await 실행('XFC RG 스테이지', { env: 'stage', 시간전: 6 });
    await 항목(스테이지, 'RG', 'XFC-001', 'PASS');
    const 도는중 = await 실행('XFC RR 도는 중', { status: 'RUNNING', 시간전: 5 });
    await 항목(도는중, 'RR', 'XFC-001', 'PASS');
    const 기능 = await 실행('XFC RF 기능', { kind: 'FN', 시간전: 4 });
    await 항목(기능, 'RF', 'XFC-001', 'PASS');
    const 시나리오실행 = await 실행('XFC RS 시나리오', { kind: 'SCENARIO', 시나리오: [시나리오번호, 1], 시간전: 3 });
    await 항목(시나리오실행, 'RS', 'XFC-001', 'PASS');

    const RE = await 실행('XFC RE 같은 시각', { 시간전: 2 });
    await 항목(RE, 'RE', 'XFC-001', 'PASS');
    const RT = await 실행('XFC RT 이번', { 시간전: 2 });
    await 항목(RT, 'RT', 'XFC-001', 'FAIL', { attempt: 1, 검증문장: 개수문장, 비밀: true });
    await 항목(RT, 'RT', 'XFC-001', 'FAIL', { attempt: 2, 검증문장: 개수문장 });
    await 항목(RT, 'RT', 'XFC-001', 'FAIL', { platform: 'mobile', 검증문장: 개수문장 });
    await 항목(RT, 'RT', 'XFC-002', 'PASS');
    await 항목(RT, 'RT', 'XFC-002', 'FAIL', { platform: 'mobile', 검증문장: '담은 상품이 목록에 보인다' });
    await 항목(RT, 'RT', 'XFC-003', 'NA', { 오류: 'TIMEOUT' });
    await 항목(RT, 'RT', 'XFC-004', 'FAIL', { 미확정: true, 검증문장: '화면에서 본 문장' });
    await 항목(RT, 'RT', 'XFC-005', 'PASS');
    await pool.query(
      `UPDATE test_run SET started_at = (SELECT started_at FROM test_run WHERE run_id = $2) WHERE run_id = $1`,
      [RE, RT],
    );

    const RN = await 실행('XFC RN 이번 뒤', { 시간전: 1 });
    await 항목(RN, 'RN', 'XFC-001', 'PASS');
  });

  afterAll(async () => {
    await 치우기();
    await pool.end();
  });

  it('확정 실패만 카드에 든다 — 미확정 실패 · 통과 · 미실행은 안 든다', async () => {
    const 결과 = await 실패카드(실행번호['XFC RT 이번']!, 1);
    expect(결과.items.map((c) => c.tcId)).toEqual(['XFC-001', 'XFC-002']);
    expect(결과.items[0]!.devices.map((d) => d.platform)).toEqual(['desktop', 'mobile']);
    expect(결과.items[1]!.devices.map((d) => d.platform)).toEqual(['mobile']);
    expect(결과).toMatchObject({ total: 2, page: 1, pageSize: 20 });
  });

  it('item 은 항목 조회와 같은 함수로 읽은 것이라 비밀값이 가려진다', async () => {
    const 결과 = await 실패카드(실행번호['XFC RT 이번']!, 1);
    const 데스크톱 = 결과.items[0]!.devices[0]!;
    const 원래 = await findItem(실행번호['XFC RT 이번']!, 항목번호['RT|XFC-001|desktop|1']!);
    expect(데스크톱.item).toEqual(원래);
    expect(데스크톱.item.params).toEqual({ username: 'xfc-user', password: '********' });
    expect(데스크톱.item.expected).toEqual({ token: '********', count: 2 });
    expect(JSON.stringify(결과)).not.toContain('SECRET');
    expect(데스크톱.item.steps[1]).toMatchObject({
      status: 'FAIL',
      screenshotPath: expect.stringContaining('/shots/xfc-'),
    });
    expect(데스크톱.item.steps[1]!.assertions[0]).toMatchObject({
      statement: '목록에 보이는 할 일 개수가 기대와 같다',
      expected: 2,
      actual: 1,
    });
  });

  it('최근 흐름은 같은 서비스 · env · 종류의 끝난 실행을 이번까지, 맨 앞이 이번이다', async () => {
    const 결과 = await 실패카드(실행번호['XFC RT 이번']!, 1);
    const [데스크톱, 모바일] = 결과.items[0]!.devices;
    expect(데스크톱!.recent).toEqual(['FAIL', 'FAIL', 'FAIL', 'PASS']);
    expect(모바일!.recent).toEqual(['FAIL', 'PASS']);
    expect(결과.items[1]!.devices[0]!.recent).toEqual(['FAIL', 'PASS']);
  });

  it('이번 실행과 started_at 이 같은 다른 실행은 흐름 칸이 되지 않는다', async () => {
    const 결과 = await 실패카드(실행번호['XFC RT 이번']!, 1);
    const 데스크톱 = 결과.items[0]!.devices[0]!;
    expect(데스크톱.recent).toEqual(['FAIL', 'FAIL', 'FAIL', 'PASS']);
    expect(데스크톱.streak).toBe(3);
  });

  it('change 는 앞 실행과 견준 케이스 판정이고 연속 실패 수는 계속깨짐일 때만이다', async () => {
    const 결과 = await 실패카드(실행번호['XFC RT 이번']!, 1);
    const [데스크톱, 모바일] = 결과.items[0]!.devices;
    expect(데스크톱).toMatchObject({ change: '계속깨짐', streak: 3 });
    expect(모바일).toMatchObject({ change: '새로깨짐', streak: null });
    expect(결과.items[1]!.devices[0]).toMatchObject({ change: '새로깨짐', streak: null });
  });

  it('platform 을 주면 그 디바이스만 거른 뒤 자른다', async () => {
    const 모바일 = await 실패카드(실행번호['XFC RT 이번']!, 1, 'mobile');
    expect(모바일.total).toBe(2);
    expect(모바일.items.flatMap((c) => c.devices.map((d) => d.platform))).toEqual(['mobile', 'mobile']);
    const 데스크톱 = await 실패카드(실행번호['XFC RT 이번']!, 1, 'desktop');
    expect(데스크톱.total).toBe(1);
    expect(데스크톱.items[0]!.tcId).toBe('XFC-001');
    const 안드로이드 = await 실패카드(실행번호['XFC RT 이번']!, 1, 'android');
    expect(안드로이드).toMatchObject({ items: [], total: 0 });
  });

  it('회차가 둘이면 attempts · failedAttempts 를 세고 item 은 처음 실패한 회차다', async () => {
    const 결과 = await 실패카드(실행번호['XFC RT 이번']!, 1);
    const 데스크톱 = 결과.items[0]!.devices[0]!;
    expect(데스크톱).toMatchObject({ attempts: 2, failedAttempts: 2 });
    expect(데스크톱.item.historyId).toBe(항목번호['RT|XFC-001|desktop|1']);
    expect(결과.items[0]!.devices[1]).toMatchObject({ attempts: 1, failedAttempts: 1 });
  });

  it('쪽 번호가 범위를 넘으면 빈 쪽이다', async () => {
    const 결과 = await 실패카드(실행번호['XFC RT 이번']!, 2);
    expect(결과).toMatchObject({ items: [], total: 2, page: 2 });
  });
});
