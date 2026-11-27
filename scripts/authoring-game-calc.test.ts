// 게임 전략 계산기 — 길 덮기 · 설치 자리 · 계산 이름 · CALC 줄 초안을 손으로 센 값과 비교한다(시뮬은 authoring-game-sim.test.ts)
import { describe, expect, it } from 'vitest';

import { 계산하기, 원안길이, 자리, 줄초안 } from './authoring-game-calc.js';

const 직선 = [[0, 0], [10, 0]] as const;
type 결과 = Exclude<ReturnType<typeof 자리>, { 틀림: string }>;

describe('길 덮기', () => {
  it('원이 길을 가로지르면 현의 길이, 길 한쪽 끝이 원 안이면 거기까지, 안 닿으면 0', () => {
    expect(원안길이(직선, { 중심: [5, 0], 반지름: 3 })).toBeCloseTo(6);
    expect(원안길이(직선, { 중심: [5, 3], 반지름: 5 })).toBeCloseTo(8);
    expect(원안길이(직선, { 중심: [0, 0], 반지름: 2 })).toBeCloseTo(2);
    expect(원안길이(직선, { 중심: [5, 4], 반지름: 3 })).toBe(0);
  });

  it('꺾인 길은 선분마다 더하고, 선분 밖으로 이어진 직선 부분은 안 센다', () => {
    expect(원안길이([[0, 0], [4, 0], [4, 6]], { 중심: [4, 0], 반지름: 2 })).toBeCloseTo(4);
    expect(원안길이([[0, 0], [2, 0]], { 중심: [10, 0], 반지름: 7 })).toBe(0);
  });
});

describe('설치 자리 고르기', () => {
  it('길을 많이 덮는 자리 순으로 놓고 못 놓는 원 안은 뺀다', () => {
    const r = 자리({ 길: 직선, 사거리: 3, 후보: [{ 이름: '끝', 자리: [0, 0] }, { 이름: '가운데', 자리: [5, 0] }, { 이름: '멀리', 자리: [5, 9] }, { 이름: '웅덩이', 자리: [6, 1] }], 못놓는곳: [{ 중심: [6, 1], 반지름: 1 }] }) as 결과;
    expect(r.결과).toMatchObject({ 순서: [{ 이름: '가운데', 덮음: 6 }, { 이름: '끝', 덮음: 3 }, { 이름: '멀리', 덮음: 0 }], 뺌: ['웅덩이'] });
    expect(자리({ 길: 직선, 사거리: 0, 후보: [] })).toMatchObject({ 틀림: expect.any(String) });
  });

  it('길 전체 길이가 0 이면 입력 오류다 — 비율이 NaN 으로 찍히지 않게', () => {
    expect(자리({ 길: [[1, 1], [1, 1]], 사거리: 3, 후보: [{ 이름: 'a', 자리: [1, 1] }] })).toMatchObject({ 틀림: expect.stringContaining('길') });
  });
});

describe('계산하기 · CALC 줄 초안', () => {
  it('계산 이름이 틀리면 알려 주고, 이름은 입력의 이름 · 없으면 파일 이름이며 줄은 짐작(GUESS) CALC 다', () => {
    expect(계산하기({ 계산: '점치기' }, 'x')).toMatchObject({ 틀림: expect.stringContaining('시뮬') });
    expect(계산하기({ 계산: '버티기' }, 'x')).toMatchObject({ 틀림: expect.stringContaining('뺐다') });
    const 입력 = { 계산: '자리', 곳: 'stage:둘째 맵', 빌드데이터: true, 길: 직선, 사거리: 3, 후보: [{ 이름: 'a', 자리: [5, 0] }] };
    const r = 계산하기(입력, '둘째 맵 자리');
    expect(r).not.toHaveProperty('틀림');
    expect(줄초안(r as 결과, 입력)).toMatchObject({ kind: 'CALC', key: 'calc:둘째 맵 자리', learned: { belief: 'GUESS', data: { 곳: 'stage:둘째 맵', 출처: '빌드 데이터' } } });
  });
});
