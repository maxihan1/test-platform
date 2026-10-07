// 앱 대시보드 질의 검사 — 접은 줄 · 앞 실행 · 실행 중 · 요구사항 커버리지 · 시간대 (도메인/리포팅 §8.12)
// CI에는 postgres가 없을 수 있다. 실접속 검사는 DATABASE_URL이 있을 때만 돈다

import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { 대시보드, 대시보드실행중, 시간대확인, 틀린시간대 } from './dashboardResults.js';

const 연결 = process.env.DATABASE_URL;
const 접두사들 = ['XDQ', 'XDQB', 'XDQT'];

const 날짜글자 = (시각: Date, tz: string): string => 시각.toLocaleDateString('sv-SE', { timeZone: tz });

describe('시간대 이름표 캐시', () => {
  it('처음 읽기가 실패해도 캐시에 남기지 않고 다음 호출에서 다시 읽는다', async () => {
    const query = vi
      .fn()
      .mockRejectedValueOnce(new Error('연결이 끊겼다'))
      .mockResolvedValue({ rows: [{ name: 'UTC' }] });
    const pool = { query } as unknown as Pool;
    await expect(시간대확인(pool, 'UTC')).rejects.toThrow('연결이 끊겼다');
    await expect(시간대확인(pool, 'UTC')).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledTimes(2);
  });
});

describe.skipIf(연결 === undefined)('대시보드 질의', () => {
  let pool: Pool;
  let A = 0;
  let B = 0;
  let T = 0;
  const 실행번호: Record<string, number> = {};
  let 작성원본 = 0;
  let 작성최신 = 0;

  async function 치우기(): Promise<void> {
    const 서비스들 = (await pool.query<{ id: string }>('SELECT id FROM service WHERE prefix = ANY($1)', [접두사들]))
      .rows.map((r) => Number(r.id));
    if (서비스들.length === 0) return;
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1))', [서비스들]);
    await pool.query('DELETE FROM test_run WHERE service_id = ANY($1)', [서비스들]);
    await pool.query('DELETE FROM scenario_version WHERE scenario_id IN (SELECT id FROM scenario WHERE service_id = ANY($1))', [서비스들]);
    await pool.query('DELETE FROM scenario WHERE service_id = ANY($1)', [서비스들]);
    await pool.query('DELETE FROM authoring_request WHERE service_id = ANY($1)', [서비스들]);
    await pool.query('DELETE FROM service WHERE id = ANY($1)', [서비스들]);
  }

  async function 서비스만들기(접두: string, 이름: string): Promise<number> {
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir) VALUES ($1, $2, '#445566', '', $3) RETURNING id`,
      [접두, 이름, 접두.toLowerCase()],
    );
    return Number(r.rows[0]!.id);
  }

  async function 실행(
    서비스: number,
    서비스이름: string,
    이름: string,
    옵션: { env?: string; kind?: string; status?: string; 시간전?: number; 시나리오?: [number, number] } = {},
  ): Promise<number> {
    const { env = 'qa', kind = 'UI', status = 'FINISHED', 시간전 = 1, 시나리오 } = 옵션;
    const r = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url,
                             kind, scenario_id, scenario_version, started_at, finished_at)
       VALUES ($1, 'xdq', $2, $3, $4, $5, '', '', $6, $7, $8,
               now() - $9::double precision * interval '1 hour',
               CASE WHEN $3 = 'RUNNING' THEN NULL ELSE now() - $9::double precision * interval '1 hour' + interval '5 minutes' END)
       RETURNING run_id`,
      [이름, env, status, 서비스, 서비스이름, kind, 시나리오?.[0] ?? null, 시나리오?.[1] ?? null, 시간전],
    );
    실행번호[이름] = Number(r.rows[0]!.run_id);
    return 실행번호[이름];
  }

  async function 항목(
    runId: number,
    tcId: string,
    status: string,
    옵션: {
      attempt?: number;
      platform?: string;
      미확정?: boolean;
      끝나지않음?: boolean;
      오류?: string;
      검증문장?: string;
    } = {},
  ): Promise<void> {
    const { attempt = 1, platform = 'desktop', 미확정 = false, 끝나지않음 = false, 오류, 검증문장 } = 옵션;
    const r = await pool.query<{ history_id: string }>(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms,
                             precondition, params, expected, param_schema, expected_schema,
                             status, duration_ms, error, unconfirmed, finished_at)
       VALUES ($1, $2, $3, $4, $5, $6, 300000, '[]', '{}', '{}', '{}', '{}', $7, 100, $8, $9,
               CASE WHEN $10 THEN NULL ELSE now() END)
       RETURNING history_id`,
      [
        runId,
        tcId,
        platform,
        attempt,
        `${tcId} 케이스`,
        `x/${tcId}.spec.ts`,
        status,
        오류 === undefined ? null : JSON.stringify({ message: 오류 }),
        미확정 ? '화면에서 본 값' : null,
        끝나지않음,
      ],
    );
    if (검증문장 !== undefined) {
      await pool.query(
        `INSERT INTO run_item_step (history_id, seq, title, status, duration_ms, assertions) VALUES ($1, 1, '단계', 'FAIL', 10, $2)`,
        [
          Number(r.rows[0]!.history_id),
          JSON.stringify([{ statement: 검증문장, status: 'FAIL', actual: 'SECRET-VALUE', expected: 'SECRET-EXPECTED' }]),
        ],
      );
    }
  }

  async function 작성요청(
    서비스: number,
    종류: 'AUTHOR' | 'RERUN',
    상태: 'DONE' | 'STOPPED',
    일전: number,
    셈: [number, number, number, number] | null,
    원본: number | null = null,
  ): Promise<number> {
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, source_id, requested_by, requested_by_name, status,
                                      created_at, started_at, finished_at, stop_reason, stopped_by,
                                      coverage_total, coverage_cased, coverage_excluded, coverage_missing)
       VALUES ($1, $2, $3, 'xdq', '시험자', $4, now() - $5::double precision * interval '1 day',
               now() - $5::double precision * interval '1 day', now() - $5::double precision * interval '1 day',
               CASE WHEN $4 = 'STOPPED' THEN 'REJECTED' END, CASE WHEN $4 = 'STOPPED' THEN 'system' END,
               $6, $7, $8, $9)
       RETURNING id`,
      [서비스, 종류, 원본, 상태, 일전, ...(셈 ?? [null, null, null, null])],
    );
    return Number(r.rows[0]!.id);
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await 치우기();
    A = await 서비스만들기('XDQ', 'XDQ 마켓');
    B = await 서비스만들기('XDQB', 'XDQB 남의 서비스');
    T = await 서비스만들기('XDQT', 'XDQT 시간대');

    const 시나리오 = await pool.query<{ id: string }>(
      `INSERT INTO scenario (service_id, name, created_by) VALUES ($1, 'XDQ 주문 흐름', 'xdq') RETURNING id`,
      [A],
    );
    const 시나리오번호 = Number(시나리오.rows[0]!.id);
    await pool.query(
      `INSERT INTO scenario_version (scenario_id, version, parts, saved_by, saved_by_name) VALUES ($1, 1, '[]', 'xdq', '검사')`,
      [시나리오번호],
    );

    // 28일 창 밖(40일 전)의 앞 실행 — R1 이 이것과 견준다
    const R0 = await 실행(A, 'XDQ 마켓', 'XDQ R0 옛 실행', { 시간전: 960 });
    for (const tc of ['XDQ-001', 'XDQ-002', 'XDQ-011']) await 항목(R0, tc, 'PASS');

    const R1 = await 실행(A, 'XDQ 마켓', 'XDQ R1', { 시간전: 120 });
    await 항목(R1, 'XDQ-001', 'PASS', { attempt: 1 });
    await 항목(R1, 'XDQ-001', 'FAIL', { attempt: 2, 오류: '러너 오류' });
    await 항목(R1, 'XDQ-001', 'PASS', { attempt: 3 });
    await 항목(R1, 'XDQ-002', 'PASS');
    await 항목(R1, 'XDQ-003', 'PASS', { attempt: 1 });
    await 항목(R1, 'XDQ-003', 'NA', { attempt: 2 });
    await 항목(R1, 'XDQ-004', 'FAIL', { 미확정: true });
    await 항목(R1, 'XDQ-011', 'FAIL', { 검증문장: 'XDQ 로그인 버튼이 보인다' });

    const R2 = await 실행(A, 'XDQ 마켓', 'XDQ R2 스테이지', { env: 'stage', 시간전: 72 });
    await 항목(R2, 'XDQ-005', 'PASS');

    const R3 = await 실행(A, 'XDQ 마켓', 'XDQ R3', { 시간전: 48 });
    await 항목(R3, 'XDQ-001', 'PASS');
    await 항목(R3, 'XDQ-008', 'PASS');
    await 항목(R3, 'XDQ-002', 'FAIL', { 오류: 'XDQ 주소가 틀렸다\n  at secret/stack.ts:1' });

    const R4 = await 실행(A, 'XDQ 마켓', 'XDQ R4 도는 중', { status: 'RUNNING', 시간전: 36 });
    await 항목(R4, 'XDQ-002', 'PASS');
    await 항목(R4, 'XDQ-003', 'FAIL');
    await 항목(R4, 'XDQ-004', 'NA', { 끝나지않음: true });

    const R8 = await 실행(A, 'XDQ 마켓', 'XDQ R8 스테이지', { env: 'stage', 시간전: 30 });
    await 항목(R8, 'XDQ-008', 'FAIL');

    const R5 = await 실행(A, 'XDQ 마켓', 'XDQ R5', { 시간전: 24 });
    await 항목(R5, 'XDQ-002', 'FAIL');
    await 항목(R5, 'XDQ-006', 'FAIL');

    const R6 = await 실행(A, 'XDQ 마켓', 'XDQ R6 시나리오', { kind: 'SCENARIO', 시나리오: [시나리오번호, 1], 시간전: 20 });
    await 항목(R6, 'XDQ-099', 'FAIL');
    await 실행(A, 'XDQ 마켓', 'XDQ R7 도는 시나리오', {
      kind: 'SCENARIO',
      status: 'RUNNING',
      시나리오: [시나리오번호, 1],
      시간전: 10,
    });

    const 남 = await 실행(B, 'XDQB 남의 서비스', 'XDQB 남의 실행 제목', { 시간전: 5 });
    await 항목(남, 'XDQB-001', 'FAIL', { 검증문장: 'XDQB 남의 검증 문장' });
    const 남이도는 = await 실행(B, 'XDQB 남의 서비스', 'XDQB 남의 도는 실행', { status: 'RUNNING', 시간전: 1 });
    await 항목(남이도는, 'XDQB-002', 'NA', { 끝나지않음: true });

    작성원본 = await 작성요청(A, 'AUTHOR', 'DONE', 10, [10, 6, 2, 2]);
    await 작성요청(A, 'AUTHOR', 'DONE', 40, [10, 5, 3, 2]);
    작성최신 = await 작성요청(A, 'RERUN', 'DONE', 5, [10, 8, 1, 1], 작성원본);
    await 작성요청(A, 'AUTHOR', 'STOPPED', 1, [10, 9, 0, 1]);
    await 작성요청(B, 'AUTHOR', 'DONE', 40, [4, 4, 0, 0]);
    await 작성요청(T, 'AUTHOR', 'DONE', 2, [0, 0, 0, 0]);

    const 시간대실행 = await pool.query<{ run_id: string }>(
      `INSERT INTO test_run (title, triggered_by, env, status, service_id, service_name, tests_repo, base_url, kind, started_at, finished_at)
       VALUES ('XDQT 시간대 실행', 'xdq', 'qa', 'FINISHED', $1, 'XDQT 시간대', '', '', 'UI',
               (date_trunc('day', now() AT TIME ZONE 'UTC') - interval '1 day' + interval '23 hours') AT TIME ZONE 'UTC',
               (date_trunc('day', now() AT TIME ZONE 'UTC') - interval '1 day' + interval '23 hours') AT TIME ZONE 'UTC')
       RETURNING run_id`,
      [T],
    );
    await 항목(Number(시간대실행.rows[0]!.run_id), 'XDQT-001', 'PASS');
  });

  afterAll(async () => {
    await 치우기();
    await pool.end();
  });

  describe('접은 줄', () => {
    it('회차를 접고 미확정 · 시나리오 · 진행 중 실행을 뺀 수를 낸다', async () => {
      const 결과 = await 대시보드('UTC', [A], [A]);
      expect(결과.passRate.current).toEqual({ pass: 4, fail: 6, notRun: 1 });
      expect(결과.passRate.previous).toEqual({ pass: 0, fail: 0, notRun: 0 });
      expect(결과.unconfirmed).toBe(1);
      expect(결과.services).toEqual([{ id: A, name: 'XDQ 마켓' }]);
    });

    it('서비스별에 마지막 실행과 흐름 · 신규 실패 수 · 해결 수를 싣는다', async () => {
      const 결과 = await 대시보드('UTC', [A], [A]);
      expect(결과.byService).toHaveLength(1);
      const 칸 = 결과.byService[0]!;
      expect(칸.current).toEqual({ pass: 4, fail: 6, notRun: 1 });
      expect(칸.lastRun).toMatchObject({ runId: 실행번호['XDQ R5'], pass: 0, fail: 2, notRun: 0 });
      expect(칸.flow).toEqual(['F', 'P', 'F', 'F', 'F']);
      expect(칸.newFailureCount).toBe(2);
      expect(칸.resolvedCount).toBe(1);
      expect(칸.compared).toBe(true);
    });

    it('앞 실행이 없는 서비스는 견주지 않았다고 낸다', async () => {
      const 결과 = await 대시보드('UTC', [T], []);
      expect(결과.byService.map((s) => s.compared)).toEqual([false]);
    });

    it('히트맵은 실패 많은 케이스부터다', async () => {
      const 결과 = await 대시보드('UTC', [A], [A]);
      expect(결과.heatmap[0]).toMatchObject({ tcId: 'XDQ-002', failCount: 2 });
      expect(결과.heatmap[0]?.cells).toHaveLength(14);
      expect(결과.heatmap.map((h) => h.tcId)).not.toContain('XDQ-099');
    });
  });

  describe('신규 실패', () => {
    it('앞 실행이 28일 창 밖이어도 견주고, 다시 통과한 것은 뺀다', async () => {
      const 결과 = await 대시보드('UTC', [A], [A]);
      const ids = 결과.newFailures.map((n) => n.tcId);
      expect(ids).toContain('XDQ-011');
      expect(ids).not.toContain('XDQ-001');
    });

    it('다른 env 실행끼리는 안 견주고, 앞이 진행 중이면 그 앞을 쓴다', async () => {
      const 결과 = await 대시보드('UTC', [A], [A]);
      expect(결과.newFailures.map((n) => [n.runId, n.tcId])).toEqual([
        [실행번호['XDQ R3'], 'XDQ-002'],
        [실행번호['XDQ R1'], 'XDQ-011'],
      ]);
    });

    it('사유는 대표 문장이고 실제 값은 없다', async () => {
      const 결과 = await 대시보드('UTC', [A], [A]);
      expect(결과.newFailures.map((n) => n.reason)).toEqual(['XDQ 주소가 틀렸다', 'XDQ 로그인 버튼이 보인다']);
      const 글 = JSON.stringify(결과);
      expect(글).not.toContain('SECRET-VALUE');
      expect(글).not.toContain('SECRET-EXPECTED');
      expect(글).not.toContain('secret/stack.ts');
    });
  });

  describe('실행 중', () => {
    it('진행 중인 케이스 실행만 항목 수와 함께 낸다 — 시나리오 실행은 없다', async () => {
      const { running } = await 대시보드실행중('UTC', [A]);
      expect(running).toHaveLength(1);
      expect(running[0]).toMatchObject({
        runId: 실행번호['XDQ R4 도는 중'],
        serviceId: A,
        serviceName: 'XDQ 마켓',
        title: 'XDQ R4 도는 중',
        doneItems: 2,
        totalItems: 3,
        failedItems: 1,
      });
      expect((await 대시보드('UTC', [A], [A])).running).toEqual(running);
    });
  });

  describe('요구사항 커버리지', () => {
    it('작성 read 서비스마다 30일 안 마지막 DONE 하나를 낸다 — 중단과 30일 밖은 뺀다', async () => {
      const 결과 = await 대시보드('UTC', [A], [A]);
      expect(결과.coverage).toHaveLength(1);
      expect(결과.coverage[0]).toMatchObject({
        serviceId: A,
        serviceName: 'XDQ 마켓',
        cased: 8,
        total: 10,
        ratio: 0.8,
        requestId: 작성원본,
      });
      expect(작성최신).not.toBe(작성원본);
    });

    it('요구가 0 이면 비율을 비운다', async () => {
      const 결과 = await 대시보드('UTC', [A], [A, T]);
      expect(결과.coverage.find((c) => c.serviceId === T)).toMatchObject({ total: 0, cased: 0, ratio: null });
    });

    it('30일 밖 DONE 만 있는 서비스는 커버리지에 없다', async () => {
      const 결과 = await 대시보드('UTC', [B], [B]);
      expect(결과.coverage).toEqual([]);
    });
  });

  describe('배정 안 된 서비스', () => {
    it('접기 · 실행 중 · 커버리지 어디에도 안 나온다', async () => {
      const 결과 = await 대시보드('UTC', [A], [A]);
      expect(JSON.stringify(결과)).not.toContain('XDQB');
      expect(JSON.stringify(await 대시보드실행중('UTC', [A]))).not.toContain('XDQB');
    });

    it('실행 서비스에만 있으면 커버리지에는 안 나오고, 둘 다에 있으면 나온다', async () => {
      const 실행만 = await 대시보드('UTC', [A, B], [A]);
      expect(실행만.byService.map((s) => s.serviceId)).toEqual([A, B]);
      expect(실행만.coverage.map((c) => c.serviceId)).toEqual([A]);
      const 둘다 = await 대시보드('UTC', [B], [B]);
      expect(JSON.stringify(둘다)).toContain('XDQB 남의 서비스');
      expect(둘다.running[0]?.title).toBe('XDQB 남의 도는 실행');
    });

    it('서비스가 하나도 없으면 빈 응답이다', async () => {
      const 결과 = await 대시보드('UTC', [], []);
      expect(결과.passRate.current).toEqual({ pass: 0, fail: 0, notRun: 0 });
      expect([결과.byService, 결과.newFailures, 결과.running, 결과.coverage]).toEqual([[], [], [], []]);
    });
  });

  describe('시간대', () => {
    it('같은 실행이 tz 에 따라 다른 날로 센다', async () => {
      const 지금 = new Date();
      const 어제UTC = 날짜글자(new Date(지금.getTime() - 24 * 3600 * 1000), 'UTC');
      const 오늘UTC = 날짜글자(지금, 'UTC');
      const 칸 = (결과: Awaited<ReturnType<typeof 대시보드>>, day: string) => 결과.daily.find((d) => d.day === day);

      const utc = await 대시보드('UTC', [T], []);
      expect(칸(utc, 어제UTC)?.pass).toBe(1);
      const 서울 = await 대시보드('Asia/Seoul', [T], []);
      expect(칸(서울, 오늘UTC)?.pass).toBe(1);
      expect(칸(서울, 어제UTC)?.pass ?? 0).toBe(0);
      expect(서울.window.today).toBe(날짜글자(지금, 'Asia/Seoul'));
    });

    it.each(['Mars/Phobos', '+09', 'KST', ''])('목록에 없는 이름 %j 은 거절한다', async (tz) => {
      await expect(대시보드(tz, [A], [A])).rejects.toBeInstanceOf(틀린시간대);
    });
  });
});
