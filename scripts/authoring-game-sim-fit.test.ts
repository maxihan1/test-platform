// 숫자 맞추기 — 맞추기 읽기 · 입력에 넣기 · 줄 값 검사 · 판 기록에 맞는 값 찾기 · 판마다 갈리면 규칙이 빠짐
import { describe, expect, it } from 'vitest';

import { 돌리기, 입력읽기 } from '@platform/kit/gameplay';

import { 시뮬값들 } from './authoring-game-sim-compare.js';
import { 값칸들, 맞출값읽기, 맞춘입력, 숫자맞추기, 줄맞춘입력 } from './authoring-game-sim-fit.js';

const 웨 = { 쉬는초: 20, 출현: [{ 종류: '슬라임', 수: 1, 간격: 0, 길: '가' }] };
const 기본 = (덧: Record<string, unknown> = {}): Record<string, unknown> => ({
  계산: '시뮬',
  곳: 'stage:시험',
  지킬것: { 체력: 10, 자리: [10, 0] },
  길: { 가: [[0, 0], [10, 0]] },
  적종류: [{ 이름: '슬라임', 체력: 10, 속도: 1, 닿으면피해: 5, 보상: 1 }, { 이름: '큰슬라임', 체력: 30, 속도: 1, 닿으면피해: 5, 보상: 3 }],
  웨이브: [웨, 웨, 웨],
  설치물종류: [{ 이름: '탑', 레벨: [{ 값: 0, 사거리: 3, 공격력: 5, 간격: 2 }, { 값: 4, 사거리: 3, 공격력: 9, 간격: 2 }] }],
  설치물둘레: { 반경: 0.5, 근거: 'rule:둘레' },
  자리후보: [[5, 1]],
  캐릭터: { 자리: [5, 1], 걷기속도: 1 },
  재화: { 시작: 0, 초당: 0 },
  볼값연결: { 웨이브: '웨이브', 지킬것: '세계수', 재화: '고기' },
  정책: [{ 조건: [], 행동: { 무엇: '놓기', 대상: '탑' } }],
  ...덧,
});
const 모델로 = (x: Record<string, unknown>) => {
  const m = 입력읽기(x);
  if ('틀림' in m) throw new Error(m.틀림);
  return m;
};
/** 참값으로 흘린 시뮬을 판 기록처럼 — 행동 없이 재화만 초당으로 오른다 */
const 판 = (이름: string, 초당: number) => {
  const m = 모델로(기본({ 재화: { 시작: 0, 초당 } }));
  return { 이름, 판: 시뮬값들(돌리기(m, [], undefined, []), m.볼값연결), 행: [] };
};

describe('맞추기 읽기 · 입력에 넣기', () => {
  it('경로 · 범위를 보고, 손 시간 · 걷는 속도 · 배율 없는 * · 없는 칸은 받지 않는다', () => {
    expect(맞출값읽기(기본({ 맞추기: { '적종류.슬라임.체력': [5, 40], '적종류.*.속도': { 배율: [0.5, 2] } } }))).toEqual([
      { 경로: '적종류.슬라임.체력', 하한: 5, 상한: 40, 배율: false },
      { 경로: '적종류.*.속도', 하한: 0.5, 상한: 2, 배율: true },
    ]);
    expect(맞출값읽기(기본())).toEqual([]);
    expect(맞출값읽기(기본({ 맞추기: { '손.행동초': [0.5, 3] } }))).toMatchObject({ 틀림: expect.stringContaining('판 기록에서 잰다') });
    expect(맞출값읽기(기본({ 맞추기: { '캐릭터.걷기속도': [1, 5] } }))).toMatchObject({ 틀림: expect.stringContaining('맞출 수 없다') });
    expect(맞출값읽기(기본({ 맞추기: { '적종류.*.체력': [5, 40] } }))).toMatchObject({ 틀림: expect.stringContaining('같은 배율') });
    expect(맞출값읽기(기본({ 맞추기: { '적종류.유령.체력': [5, 40] } }))).toMatchObject({ 틀림: expect.stringContaining('숫자 칸이 아니다') });
    expect(맞출값읽기(기본({ 맞추기: { '재화.초당': [3, 1] } }))).toMatchObject({ 틀림: expect.stringContaining('하한 < 상한') });
  });

  it('목록은 이름으로 · 수는 차례로 · * 는 전부 고르고, 배율은 원래 값에 곱한다 — 원본은 안 고친다', () => {
    const 입력 = 기본();
    expect(값칸들(입력, '설치물종류.탑.레벨.1.공격력')).toHaveLength(1);
    const 맞출들 = 맞출값읽기(기본({ 맞추기: { '적종류.슬라임.체력': [5, 40], '적종류.*.체력': { 배율: [0.5, 2] }, '설치물종류.탑.레벨.1.공격력': [1, 20] } }));
    if ('틀림' in 맞출들) throw new Error(맞출들.틀림);
    const 새 = 맞춘입력(입력, 맞출들, { '적종류.슬라임.체력': 20, '적종류.*.체력': 0.5, '설치물종류.탑.레벨.1.공격력': 12 });
    expect((새.적종류 as { 체력: number }[]).map((x) => x.체력)).toEqual([10, 15]);
    expect((새.설치물종류 as { 레벨: { 공격력: number }[] }[])[0]!.레벨[1]!.공격력).toBe(12);
    expect((입력.적종류 as { 체력: number }[])[0]!.체력).toBe(10);
  });

  it('줄의 맞춘값은 입력 맞추기의 경로 · 범위 안이어야 넣는다 — 줄 글자를 고쳐 아무 값이나 못 넣게', () => {
    const 입력 = 기본({ 맞추기: { '재화.초당': [0, 3] } });
    expect(줄맞춘입력(입력, undefined)).toEqual({ 입력 });
    expect(줄맞춘입력(입력, { '재화.초당': 2 })).toMatchObject({ 입력: { 재화: { 초당: 2 } } });
    expect(줄맞춘입력(입력, { '재화.초당': 9 })).toMatchObject({ 틀림: expect.stringContaining('범위 밖') });
    expect(줄맞춘입력(입력, { '재화.시작': 2 })).toMatchObject({ 틀림: expect.stringContaining('범위 밖') });
  });
});

describe('판 기록에 맞는 값 찾기', () => {
  it('판들을 재현한 오차가 가장 작은 값을 찾는다 — 입력 0 에서 참값 1 근처로', () => {
    const 입력 = 기본({ 맞추기: { '재화.초당': [0, 3] } });
    const 맞출들 = 맞출값읽기(입력);
    if ('틀림' in 맞출들) throw new Error(맞출들.틀림);
    const r = 숫자맞추기(입력, 맞출들, [판('가', 1), 판('나', 1)], { 행동초: 0.5 });
    expect(Math.abs(r.값['재화.초당']! - 1)).toBeLessThan(0.05);
    expect(r.처음값).toEqual({ '재화.초당': 0 });
    expect(r.끝오차).toBeLessThan(r.처음오차);
    expect(r.빠짐).toEqual([]);
    expect(r.판).toEqual(['가', '나']);
  });

  it('판마다 맞는 값이 범위의 30% 보다 넓게 갈리면 숫자가 아니라 규칙이 빠진 것으로 알린다', () => {
    const 입력 = 기본({ 맞추기: { '재화.초당': [0, 3] } });
    const 맞출들 = 맞출값읽기(입력);
    if ('틀림' in 맞출들) throw new Error(맞출들.틀림);
    const r = 숫자맞추기(입력, 맞출들, [판('가', 0.5), 판('나', 2.5)], { 행동초: 0.5 });
    expect(r.빠짐).toEqual(['재화.초당']);
    expect(r.판마다['재화.초당']).toMatchObject({ 가: expect.any(Number), 나: expect.any(Number) });
  });

  it('판이 없으면 입력 값 그대로다', () => {
    const 입력 = 기본({ 맞추기: { '재화.초당': [0, 3] } });
    const 맞출들 = 맞출값읽기(입력);
    if ('틀림' in 맞출들) throw new Error(맞출들.틀림);
    expect(숫자맞추기(입력, 맞출들, [], { 행동초: 0.5 })).toMatchObject({ 값: { '재화.초당': 0 }, 판: [], 돌림: 0 });
  });
});
