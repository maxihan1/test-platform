// 게임 전략 계산기 — 길 덮기 · 설치 자리 · 계산 이름 · CALC 줄 초안을 손으로 센 값과 비교한다(엔진은 packages/kit/src/gameplay/sim.test.ts)
import { describe, expect, it } from 'vitest';

import { 순서대로 } from '@platform/kit/parts';

import { type 계산결과, 계산하기, 순서자료, 시뮬, 원안길이, 자리, 줄초안 } from './authoring-game-calc.js';

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

describe('시뮬', () => {
  const 기본 = (덧: Record<string, unknown> = {}): Record<string, unknown> => ({
    계산: '시뮬',
    곳: 'stage:시험',
    지킬것: { 체력: 10, 자리: [10, 0] },
    길: { 가: [[0, 0], [10, 0]] },
    적종류: [{ 이름: '슬라임', 체력: 10, 속도: 1, 닿으면피해: 5, 보상: 1 }],
    웨이브: [{ 이름: '1웨이브', 출현: [{ 종류: '슬라임', 수: 1, 간격: 0, 길: '가' }] }],
    설치물종류: [{ 이름: '탑', 레벨: [{ 값: 0, 사거리: 3, 공격력: 5, 간격: 2 }] }],
    자리후보: [[5, 1]],
    캐릭터: { 자리: [5, 1], 걷기속도: 1 },
    재화: { 시작: 0 },
    볼값연결: { 웨이브: '웨이브', 지킬것: '세계수', 재화: '고기' },
    정책: [{ 조건: [], 행동: { 무엇: '놓기', 대상: '탑' } }],
    ...덧,
  });

  it('계산기 시뮬은 고른 정책과 웨이브마다 결과를 줄 data 에 싣고, 못 이기면 가장 멀리 간 안을 알린다', () => {
    const r = 시뮬(기본({ 자리후보: [[5, 9], [5, 1]] }));
    expect('줄글' in r && r.줄글.join('\n')).toContain('순서표(첫 웨이브 끝까지) — 놓기 탑 (5,1)');
    expect(r).toMatchObject({ 이름: '시뮬', 글: expect.stringContaining('이기는 안 있음'), 결과: { 계산: '시뮬', 이김: true, 느려도이김: true, 정책: [{ 행동: { 무엇: '놓기' } }], 손: { 행동초: 0.5 } }, 입력요약: { 엔진판: 4, 웨이브수: 1, 보스: false } });
    expect(시뮬(기본({ 지킬것: { 체력: 4, 자리: [10, 0] }, 설치물종류: [{ 이름: '탑', 레벨: [{ 값: 0, 사거리: 3, 공격력: 1, 간격: 2 }] }] }))).toMatchObject({ 글: expect.stringContaining('이기는 안 없음'), 결과: { 이김: false, 짐: { 웨이브: '1웨이브' } } });
  });

  it('순서자료는 이기는 시뮬 결과에서만 나오고, 케이스가 kit 순서대로 에 그대로 넘기면 그 순서로 판을 한다', async () => {
    const 입력 = 기본({ 재현: undefined });
    const 자료 = 순서자료(시뮬(입력) as 계산결과, 입력)!;
    expect(자료).toMatchObject({ 입력: { 곳: 'stage:시험' }, 정책: [{ 행동: { 무엇: '놓기', 대상: '탑' } }], 버금: [], 손: { 행동초: 0.5 } });
    expect(자료.입력).not.toHaveProperty('재현');
    const 짐 = 기본({ 지킬것: { 체력: 4, 자리: [10, 0] }, 설치물종류: [{ 이름: '탑', 레벨: [{ 값: 0, 사거리: 3, 공격력: 1, 간격: 2 }] }] });
    expect(순서자료(시뮬(짐) as 계산결과, 짐)).toBeNull();
    const 부름: string[] = [];
    const 상태들 = [{ 웨이브: 0, 웨이브중: false, 지킬것: 10, 재화: 0, 자리: [5, 1] as const }, { 웨이브: 1, 웨이브중: false, 지킬것: 10, 재화: 0, 자리: [5, 1] as const, 끝: '이김' as const }];
    const 손 = {
      상태: async () => (상태들.length > 1 ? 상태들.shift()! : 상태들[0]!),
      설치물: async () => [],
      떨어진: async () => [],
      걷기: async (자리: readonly [number, number]) => (부름.push(`걷기 ${자리.join(',')}`), true),
      놓기: async (종류: string, 자리: readonly [number, number]) => (부름.push(`놓기 ${종류} ${자리.join(',')}`), true),
    };
    const r = await 순서대로(손, JSON.parse(JSON.stringify(자료)) as never);
    expect(r).toEqual({ 이김: true, 끝: '이김', 행동수: 1, 다시계산수: 1 });
    expect(부름).toEqual(['걷기 5,1', '놓기 탑 5,1']);
    await expect(순서대로({ 상태: 손.상태 } as never, 자료 as never)).rejects.toThrow('손동작을 다 안 돌려줬다');
    await expect(순서대로(손, { ...자료, 정책: [{ 행동: { 무엇: '날기' } }] } as never)).rejects.toThrow('순서자료가 틀렸다');
  });
});
