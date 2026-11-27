// 계획 값 읽기의 장면 바뀜 — 앞 판 결과 화면 · 로딩 읽기는 버리고, 진행하다 바뀐 장면은 두고, 안 바뀐 값의 기대는 버린 때 · 20초부터 본다
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 값읽기시작 } from './authoring-game-play-values.js';
import type { 기대, 볼값 } from './authoring-learn-check.js';

beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] }));
afterEach(() => vi.useRealTimers());

const 볼: 볼값[] = [{ 이름: '세계수', 주소: '/T', 칸: 'T.HP' }, { 이름: '웨이브', 주소: '/W', 칸: 'W.n' }];
const 기대들: 기대[] = [{ 값: '세계수', 비교: '>=', 기준: 30 }];

/** 초마다 장면과 값을 주는 가짜 게임 — 판 시작부터 흐른 초로 정한다 */
function 게임(시작: number, 때: (초: number) => { 장면: string; 세계수: number; 웨이브: number }) {
  const 지금 = (): ReturnType<typeof 때> => 때((Date.now() - 시작) / 1000);
  return {
    get: async (주소: string) => (주소 === '/T' ? 지금().세계수 : 지금().웨이브),
    text: async () => '',
    screenshot: async () => Buffer.from('jpg'),
    scenes: async () => ({ active: 지금().장면 }),
  };
}
async function 돌려(때: Parameters<typeof 게임>[1], 초: number, 시작장면: string | null = 때(0).장면) {
  const 시작 = Date.now();
  const 고리 = 값읽기시작(게임(시작, 때) as never, 'trial:가', 볼, 기대들, 시작, 2_000, undefined, 시작장면);
  await vi.advanceTimersByTimeAsync(초 * 1000);
  return (await 고리.끝난다()).기록;
}

describe('장면 바뀜', () => {
  it('앞 판 결과 화면 → 로딩 → 새 판이면 장면이 바뀔 때마다 앞 읽기를 버려 새 판 값만 남는다', async () => {
    const r = await 돌려((s) => (s < 3 ? { 장면: 'Result', 세계수: -4, 웨이브: 6 } : s < 7 ? { 장면: 'Loading', 세계수: -4, 웨이브: 6 } : { 장면: 'Stage3', 세계수: 50, 웨이브: 1 }), 30);
    expect(r.때.length).toBeGreaterThan(5);
    expect(r.때.every((t) => t.값.웨이브 === 1)).toBe(true);
    expect(r.어긋남).toBeNull();
  });

  it('판 장면에서 시작해 값이 움직이다 20초 안에 결과 장면으로 가면(일찍 진 판) 기록 · 어긋남을 둔다', async () => {
    const r = await 돌려((s) => (s < 14 ? { 장면: 'Stage3', 세계수: 50 - s * 4, 웨이브: 1 } : { 장면: 'Result', 세계수: 0, 웨이브: 1 }), 20);
    expect(r.때[0]!.값.세계수).toBe(50);
    expect(r.어긋남).toMatchObject({ 값이름: '세계수' });
  });

  it('앞 판 결과 화면이 14초 머물러도 그 안 바뀐 값으로 기대가 안 깨지고, 새 판으로 바뀌면 그때부터 10초 동안 새 판 첫 값을 안 본다', async () => {
    const 앞판오래 = (s: number) => (s < 14 ? { 장면: 'Result', 세계수: -4, 웨이브: 6 } : { 장면: 'Stage3', 세계수: s < 30 ? 0 : 50, 웨이브: 1 });
    expect((await 돌려(앞판오래, 22)).어긋남).toBeNull();
    const 끝까지 = await 돌려(앞판오래, 40);
    expect(끝까지.때.every((t) => t.값.웨이브 === 1)).toBe(true);
    expect(끝까지.어긋남).toMatchObject({ 값: 0 });
    expect(끝까지.어긋남!.초).toBeGreaterThanOrEqual(24);
  });

  it('20초가 지나 바뀐 장면은 버리지 않는다', async () => {
    const r = await 돌려((s) => (s < 24 ? { 장면: 'Result', 세계수: 40, 웨이브: 6 } : { 장면: 'Stage3', 세계수: 50, 웨이브: 1 }), 30);
    expect(r.때.some((t) => t.값.웨이브 === 6)).toBe(true);
  });

  it('부르기 직전 장면을 기준으로 삼아 첫 읽기 때 장면을 못 읽어도 앞 판 읽기를 버린다', async () => {
    const 시작 = Date.now();
    let 첫 = true;
    const g = 게임(시작, (s) => (s < 3 ? { 장면: 'Result', 세계수: -4, 웨이브: 6 } : { 장면: 'Stage3', 세계수: 50, 웨이브: 1 }));
    const 흔들 = { ...g, scenes: async () => { if (첫) { 첫 = false; throw new Error('바뀌는 중'); } return g.scenes(); } };
    const 고리 = 값읽기시작(흔들 as never, 'trial:가', 볼, 기대들, 시작, 2_000, undefined, 'Result');
    await vi.advanceTimersByTimeAsync(12_000);
    expect((await 고리.끝난다()).기록.때.every((t) => t.값.웨이브 === 1)).toBe(true);
  });
});
