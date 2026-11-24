// 증적 · 견주기 · 실패 카드가 프로시저 줄을 실행 단위에서 읽는지 본다 — 프로시저 번호 · 차례 · Blocked 사유 · 실행 단위 폴더의 영상 · 다른 케이스의 비밀값 (도메인/리포팅 §3.3 「증적 문서 · 엑셀」 · 실행 §3.2 「테스트 프로시저 실행」 — DATABASE_URL 이 있을 때만)

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FARM_EVIDENCE_DIR, runDir } from '@platform/kit';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { collectRun } from './collect.js';
import { 실패카드 } from './failures.js';
import { compareWithPrevious } from './insights.js';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('증적의 프로시저 줄', () => {
  let pool: Pool;
  let 서비스: number;
  let 실행: number;
  let 단위: number;

  async function 지운다(): Promise<void> {
    await pool.query('DELETE FROM run_item WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM run_exec WHERE run_id IN (SELECT run_id FROM test_run WHERE service_id = $1)', [서비스]);
    await pool.query('DELETE FROM test_run WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
  }

  /** 실행 단위 안 케이스 줄 — 판정 · 사유 · 막은 케이스 · 케이스 시각은 러너 답을 저장한 꼴 그대로 넣는다 */
  async function 줄(tcId: string, 차례: number, status: string, 덮을것: { error?: string; blockedBy?: string; 시작?: string; 끝?: string; 비밀?: string } = {}): Promise<void> {
    await pool.query(
      `INSERT INTO run_item (run_id, tc_id, platform, attempt, tc_name, file_path, timeout_ms, precondition, params, expected, param_schema, expected_schema,
                             status, error, finished_at, exec_id, exec_seq, blocked_by, case_started_at, case_finished_at)
       VALUES ($1, $2, 'android', 1, $2, 'xdx/글쓰기.spec.ts', 300000, '[]', $3, '{}', $4, '{}', $5, $6, now(), $7, $8, $9, $10, $11)`,
      [
        실행,
        tcId,
        덮을것.비밀 === undefined ? {} : { password: 덮을것.비밀 },
        덮을것.비밀 === undefined ? {} : { type: 'object', properties: { password: { type: 'string', secret: true } } },
        status,
        덮을것.error === undefined ? null : { message: 덮을것.error },
        단위,
        차례,
        덮을것.blockedBy ?? null,
        덮을것.시작 ?? null,
        덮을것.끝 ?? null,
      ],
    );
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: 연결 });
    await pool.query("DELETE FROM service WHERE prefix = 'XDX'");
    서비스 = Number(
      (await pool.query<{ id: string }>(`INSERT INTO service (prefix, name, color, tests_repo, tests_dir, kind) VALUES ('XDX', 'XDX 앱', '#445566', 'https://github.com/example/xdx', 'xdx', 'APP') RETURNING id`)).rows[0]!.id,
    );
    실행 = Number(
      (
        await pool.query<{ run_id: string }>(
          `INSERT INTO test_run (title, triggered_by, triggered_by_name, status, env, base_url, service_id, service_name, tests_repo)
           VALUES ('XDX 실행', 'tester', '홍길동', 'FINISHED', 'qa', 'https://qa.example.com', $1, 'XDX 앱', 'https://github.com/example/xdx') RETURNING run_id`,
          [서비스],
        )
      ).rows[0]!.run_id,
    );
    단위 = Number(
      (
        await pool.query<{ exec_id: string }>(
          `INSERT INTO run_exec (run_id, file_path, proc_id, proc_name, platform, timeout_ms) VALUES ($1, 'xdx/글쓰기.spec.ts', 'XDX-TP-001', '글쓰기', 'android', 900000) RETURNING exec_id`,
          [실행],
        )
      ).rows[0]!.exec_id,
    );
    await 줄('XDX-FN-001', 1, 'PASS', { 시작: '2026-11-24T05:00:00Z', 끝: '2026-11-24T05:00:20Z' });
    await 줄('XDX-FN-002', 2, 'FAIL', { error: 'hunter2 로 로그인하지 못했다', 시작: '2026-11-24T05:00:20Z', 끝: '2026-11-24T05:00:45Z' });
    await 줄('XDX-FN-003', 3, 'NA', { error: 'BLOCKED', blockedBy: 'XDX-FN-002', 비밀: 'hunter2' });
  });

  afterAll(async () => {
    await 지운다();
    await pool.end();
    const { pool: shared } = await import('../db/index.js');
    await shared.end();
  });

  it('케이스 줄마다 프로시저 번호 · 이름 · 차례 · 케이스 수가 붙고, Blocked 줄은 막은 케이스로 사유를 적는다', async () => {
    const 항목들 = (await collectRun(실행))!.items;
    expect(항목들.map((i) => [i.tcId, i.procedure, i.status, i.blocked ?? null, i.notRunReason])).toEqual([
      ['XDX-FN-001', { id: 'XDX-TP-001', name: '글쓰기', seq: 1, count: 3 }, 'PASS', null, null],
      ['XDX-FN-002', { id: 'XDX-TP-001', name: '글쓰기', seq: 2, count: 3 }, 'FAIL', null, '******** 로 로그인하지 못했다'],
      ['XDX-FN-003', { id: 'XDX-TP-001', name: '글쓰기', seq: 3, count: 3 }, 'NA', { by: 'XDX-FN-002' }, '선행 케이스 XDX-FN-002 실패'],
    ]);
  });

  it('견주기의 실패 덩어리 대표 문장은 같은 실행 단위의 다른 케이스 비밀값까지 가린다', async () => {
    const 비교 = await compareWithPrevious(실행);
    expect(비교.실패덩어리들.map((d) => d.대표문장)).toEqual(['******** 로 로그인하지 못했다']);
  });

  it('실패 카드의 폰 기록은 실행 단위 폴더에서 찾는다', async () => {
    const 폴더 = mkdtempSync(join(tmpdir(), 'xdx-'));
    vi.stubEnv('PLATFORM_ARTIFACTS_DIR', 폴더);
    try {
      const 팜 = join(runDir(String(실행), String(단위)), FARM_EVIDENCE_DIR);
      mkdirSync(팜, { recursive: true });
      writeFileSync(join(팜, 'video-1.mp4'), 'mp4');
      writeFileSync(join(팜, 'logcat.txt'), 'E/AndroidRuntime: 멈춤');
      const 카드 = (await 실패카드(실행, 1)).items.find((c) => c.tcId === 'XDX-FN-002')!;
      expect(카드.devices.flatMap((d) => d.farm.map((f) => f.name))).toEqual(['logcat.txt', 'video-1.mp4']);
    } finally {
      vi.unstubAllEnvs();
      rmSync(폴더, { recursive: true, force: true });
    }
  });

  it('영상 · logcat 은 실행 단위 폴더에서 찾아 모든 케이스 블록이 같은 파일을 가리키고, 케이스의 시작 ~ 끝 시각을 덧붙인다', async () => {
    const 폴더 = mkdtempSync(join(tmpdir(), 'xdx-'));
    vi.stubEnv('PLATFORM_ARTIFACTS_DIR', 폴더);
    try {
      const 팜 = join(runDir(String(실행), String(단위)), FARM_EVIDENCE_DIR);
      mkdirSync(팜, { recursive: true });
      writeFileSync(join(팜, 'video-1.mp4'), 'mp4');
      writeFileSync(join(팜, 'logcat.txt'), 'E/AndroidRuntime: 멈춤');
      const 항목들 = (await collectRun(실행))!.items;
      expect(항목들.map((i) => i.farm)).toEqual([
        '화면 영상 1개 · logcat.txt — 실행 화면의 이 항목에서 받는다 · 이 케이스 2026-11-24T05:00:00.000Z ~ 2026-11-24T05:00:20.000Z',
        '화면 영상 1개 · logcat.txt — 실행 화면의 이 항목에서 받는다 · 이 케이스 2026-11-24T05:00:20.000Z ~ 2026-11-24T05:00:45.000Z',
        '화면 영상 1개 · logcat.txt — 실행 화면의 이 항목에서 받는다',
      ]);
    } finally {
      vi.unstubAllEnvs();
      rmSync(폴더, { recursive: true, force: true });
    }
  });
});
