// 돌린다 의 멈출 신호 검사 — 사람이 누른 중단이 자식을 죽이고 결과에 표시되는가 (도메인/작성 §7 「중단 · 폐기 · 진척」)
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import { 돌린다 } from './authoring-spawn.js';

describe('돌린다 — 멈출 신호', () => {
  it('신호가 오면 자식을 죽이고 멈춤으로죽음 으로 낸다 — 시간초과가 아니다', async () => {
    const 멈출 = new AbortController();
    setTimeout(() => 멈출.abort(), 100);
    const r = await 돌린다('sh', ['-c', 'sleep 5'], {
      cwd: tmpdir(),
      신호: 멈출.signal,
    });
    expect(r).toMatchObject({
      코드: null,
      시간초과: false,
      멈춤으로죽음: true,
    });
  });

  it('신호 없이 끝나면 멈춤으로죽음 은 거짓이다', async () => {
    const r = await 돌린다('sh', ['-c', 'exit 0'], {
      cwd: tmpdir(),
      신호: new AbortController().signal,
    });
    expect(r).toMatchObject({ 코드: 0, 멈춤으로죽음: false });
  });

  it('이미 멈춘 신호면 띄우자마자 죽인다', async () => {
    const 멈출 = new AbortController();
    멈출.abort();
    const r = await 돌린다('sh', ['-c', 'sleep 5'], {
      cwd: tmpdir(),
      신호: 멈출.signal,
    });
    expect(r.멈춤으로죽음).toBe(true);
  });
});
