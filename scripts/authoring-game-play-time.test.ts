// 명령 시간 재기 검사 — 종류 나누기 · 겹친 구간을 한 번만 세기 · 기다림
import { describe, expect, it } from 'vitest';

import { 명령종류, 바퀴줄, 시간재기 } from './authoring-game-play-time.js';

describe('명령 시간 재기', () => {
  it('cmd 이름으로 읽기 · 입력 · 기타를 나눈다', () => {
    expect(['get', 'text', 'find-by-name', 'find-at', 'find-all', 'screenshot', 'logs', 'errors', 'events'].map(명령종류)).toEqual(Array(9).fill('읽기'));
    expect(['key-down', 'click', 'swipe', 'tilt', 'drag', 'input-reset'].map(명령종류)).toEqual(Array(6).fill('입력'));
    expect(['timescale-set', 'static-set', 'invoke'].map(명령종류)).toEqual(Array(3).fill('기타'));
  });

  it('같은 종류가 겹쳐 돌면 겹친 구간은 한 번만 세고, 기다림은 명령이 하나도 안 돈 시간이다', async () => {
    let 지금 = 0;
    const 재 = 시간재기(() => 지금);
    재.켠다(0);
    const 풀기: Array<() => void> = [];
    const 대기 = (): Promise<void> => new Promise((끝) => 풀기.push(끝));
    const 첫 = 재.재서('get', 대기);
    지금 = 10;
    const 둘 = 재.재서('text', 대기);
    지금 = 30;
    풀기[0]!();
    await 첫;
    지금 = 40;
    풀기[1]!();
    await 둘;
    지금 = 50;
    const 입력 = 재.재서('key-down', 대기);
    지금 = 60;
    풀기[2]!();
    await 입력;
    expect(재.끝낸다(100)).toEqual({ 읽기ms: 40, 입력ms: 10, 기타ms: 0, 기다림ms: 50 });
  });

  it('끝낼 때 아직 도는 명령은 끝낸 때까지만 센다 · 켜기 전 명령은 안 센다', async () => {
    let 지금 = 0;
    const 재 = 시간재기(() => 지금);
    await 재.재서('ping', async () => {
      지금 = 20;
    });
    재.켠다(20);
    지금 = 30;
    void 재.재서('invoke', () => new Promise<void>(() => {}));
    expect(재.끝낸다(80)).toEqual({ 읽기ms: 0, 입력ms: 0, 기타ms: 50, 기다림ms: 10 });
  });

  it('바퀴 줄은 초로 반올림하고 기타는 1초 이상일 때만 낸다', () => {
    expect(바퀴줄({ 읽기ms: 70_400, 입력ms: 49_600, 기타ms: 100, 기다림ms: 120_000 })).toBe('바퀴: 읽기 70초 · 입력 50초 · 기다림 120초');
    expect(바퀴줄({ 읽기ms: 0, 입력ms: 0, 기타ms: 2_000, 기다림ms: 0 })).toContain('기타 2초');
  });
});
