// 길 따라 걷기 — 거쳐 갈 점마다 판 함수 걷기를 부르고, 못 닿은 점은 못감으로 남기고, 길이 없으면 곧게 간다 · 조작 도우미가 단계 걷기에 쓴다
import { describe, expect, it } from 'vitest';

import { 따라가기 } from './follow.js';
import { 가짜판, 기본, 모델로, 사이 } from './followFake.js';
import { 길따라걷기 } from './followWalk.js';
import type { 점 } from './simInput.js';

describe('길 따라 걷기', () => {
  it('출발은 빼고 거쳐 갈 점마다 걷고 마지막은 목표 자리 그대로다 · 못 닿은 점에서 멈추고 못감으로 남긴다 · 길이 없으면 곧게', async () => {
    const 걸은: string[] = [];
    const 못: 점[] = [];
    const 길 = (): 점[] => [[0, 0], [3.5, 0.5], [3.5, 4.5], [6.5, 4.5]];
    expect(await 길따라걷기(async (p) => (걸은.push(p.join(',')), true), 길, [0, 0], [6.2, 4.1], (p) => 못.push(p))).toBe(true);
    expect(걸은).toEqual(['3.5,0.5', '3.5,4.5', '6.2,4.1']);
    걸은.length = 0;
    expect(await 길따라걷기(async (p) => (걸은.push(p.join(',')), p[1] < 4), 길, [0, 0], [6.2, 4.1], (p) => 못.push(p))).toBe(false);
    expect(걸은).toEqual(['3.5,0.5', '3.5,4.5']);
    expect(못).toEqual([[3.5, 4.5]]);
    걸은.length = 0;
    expect(await 길따라걷기(async (p) => (걸은.push(p.join(',')), true), () => null, [0, 0], [6, 4], () => undefined)).toBe(true);
    expect(걸은).toEqual(['6,4']);
  });

  it('조작 도우미는 길을 받으면 단계 자리까지 거쳐 갈 점마다 판 함수 걷기를 부른다', async () => {
    const m = 모델로(기본());
    const 판 = 가짜판([사이(0), 사이(0), { ...사이(0), 끝: '짐' }]);
    await 따라가기(판.손, { 모델: m, 정책: m.정책들[0]!, 버금: [], 길: (a, b) => [a, [5, 3], b] }, 판.기록, 판.덧);
    // 놓기 자리 (5,1) 은 캐릭터 자리라 걷지 않아도 되지만 길이 돌아가라고 하면 그 점을 거친다
    expect(판.부름.filter((x) => x.startsWith('걷기'))).toEqual(['걷기 5,3', '걷기 5,1']);
  });
});
