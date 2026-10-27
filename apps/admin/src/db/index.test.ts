// DB 연결 풀이 연결 끊김(postgres 재시작 · 관리자 종료)에 admin 프로세스를 끄지 않는지 본다
import type { PoolClient } from 'pg';
import { afterEach, describe, expect, it, vi } from 'vitest';

const 연결 = process.env.DATABASE_URL;

describe.skipIf(연결 === undefined)('DB 연결 풀', () => {
  afterEach(() => vi.restoreAllMocks());

  // postgres 를 다시 시작할 때처럼 그 연결의 서버 쪽을 끊는다 — 2026-10-27 맥에서 admin 을 끈 그 오류(57P01)가 난다.
  // 끊는 쿼리는 미리 꺼내 둔 다른 연결로 보낸다 — 풀에 맡기면 방금 돌려준 그 연결을 다시 집어 자기를 끊는다
  async function 끊는다(다른: PoolClient, pid: number): Promise<void> {
    await 다른.query('SELECT pg_terminate_backend($1)', [pid]);
  }

  async function 번호(잡은: PoolClient): Promise<number> {
    return (await 잡은.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
  }

  const 남겼다 = (기록: ReturnType<typeof vi.spyOn>) =>
    vi.waitFor(() => expect(기록).toHaveBeenCalledWith(expect.stringContaining('[admin]'), expect.any(Error)), { timeout: 5_000 });

  it('놀던 연결이 끊겨도 던지지 않고 남기기만 한다', async () => {
    const { pool } = await import('./index.js');
    const 기록 = vi.spyOn(console, 'error').mockImplementation(() => {});
    const 잡은 = await pool.connect();
    const 다른 = await pool.connect();
    const pid = await 번호(잡은);
    잡은.release();
    try {
      await 끊는다(다른, pid);
    } finally {
      다른.release();
    }
    await 남겼다(기록);
  });

  // 풀은 놀던 연결에만 받는 쪽을 달고 꺼내 줄 때 뗀다 — 트랜잭션(pool.connect) 도중 끊기면 풀의 'error' 로는 못 막는다
  it('트랜잭션으로 꺼내 둔 연결이 끊겨도 던지지 않고, 그 연결의 다음 쿼리만 실패한다', async () => {
    const { pool } = await import('./index.js');
    const 기록 = vi.spyOn(console, 'error').mockImplementation(() => {});
    const 잡은 = await pool.connect();
    const 다른 = await pool.connect();
    try {
      await 잡은.query('BEGIN');
      await 끊는다(다른, await 번호(잡은));
      await 남겼다(기록);
      await expect(잡은.query('SELECT 1')).rejects.toThrow();
    } finally {
      잡은.release();
      다른.release();
    }
    expect((await pool.query<{ n: number }>('SELECT 1 AS n')).rows[0]!.n).toBe(1);
  });
});
