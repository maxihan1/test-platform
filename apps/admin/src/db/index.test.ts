// DB 연결 풀이 놀던 연결의 끊김(postgres 재시작 · 관리자 종료)에 프로세스를 끄지 않는지 본다
import { afterEach, describe, expect, it, vi } from 'vitest';

// 풀은 처음 쿼리 때 붙으므로 주소만 있으면 된다 — DB 없이도 돈다
process.env.DATABASE_URL ??= 'postgres://platform@127.0.0.1:1/platform';
const { pool } = await import('./index.js');

afterEach(() => vi.restoreAllMocks());

describe('DB 연결 풀', () => {
  // pg 는 놀던 연결이 끊기면 풀에 'error' 를 낸다. 받는 쪽이 없으면 EventEmitter 가 던져 admin 이 통째로 꺼졌다 (2026-10-27)
  it('놀던 연결이 끊겨 풀이 error 를 내도 던지지 않고 남기기만 한다', () => {
    const 기록 = vi.spyOn(console, 'error').mockImplementation(() => {});
    const 끊김 = new Error('terminating connection due to administrator command');
    expect(() => pool.emit('error', 끊김)).not.toThrow();
    expect(기록).toHaveBeenCalledWith(expect.stringContaining('[admin]'), 끊김.message);
  });
});
