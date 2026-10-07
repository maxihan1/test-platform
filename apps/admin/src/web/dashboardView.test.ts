import { describe, expect, it } from 'vitest';

import { 날짜글자, 도넛조각, 몫퍼센트, 안쪽고리길이, 증감, 통과율, 흐름글자 } from './dashboardView.js';

const 건 = (pass: number, fail: number, notRun: number) => ({ pass, fail, notRun });

describe('통과율', () => {
  it('통과 / (통과 + 실패 + 미실행) 을 정수 퍼센트로 낸다 — 미실행도 분모다', () => {
    expect(통과율(건(90, 5, 5))).toBe(90);
    expect(통과율(건(1, 1, 1))).toBe(33);
    expect(통과율(건(2, 1, 0))).toBe(67);
  });

  it('분모가 0 이면 0 이 아니라 null 이다 — 0% 로 읽히면 다 실패한 것처럼 보인다', () => {
    expect(통과율(건(0, 0, 0))).toBeNull();
  });
});

describe('몫퍼센트', () => {
  it('전체가 0 이면 null 이다', () => {
    expect(몫퍼센트(0, 0)).toBeNull();
    expect(몫퍼센트(1, 4)).toBe(25);
  });
});

describe('증감(pp)', () => {
  it('화면에 보이는 두 정수의 차이다', () => {
    expect(증감(건(87, 13, 0), 건(83, 17, 0))).toEqual({ 방향: 'up', 값: 4 });
    expect(증감(건(80, 20, 0), 건(90, 10, 0))).toEqual({ 방향: 'down', 값: 10 });
    expect(증감(건(50, 50, 0), 건(5, 5, 0))).toEqual({ 방향: 'same', 값: 0 });
  });

  it('어느 쪽이든 비었으면 null 이다 — 견줄 것이 없다', () => {
    expect(증감(건(1, 0, 0), 건(0, 0, 0))).toBeNull();
    expect(증감(건(0, 0, 0), 건(1, 0, 0))).toBeNull();
  });
});

describe('도넛 조각', () => {
  it('길이는 pathLength 100 기준이고 시작이 앞 조각 뒤에서 이어진다', () => {
    expect(도넛조각(건(50, 25, 25))).toEqual([
      { 종류: 'p', 길이: 50, 시작: 0 },
      { 종류: 'f', 길이: 25, 시작: 50 },
      { 종류: 'n', 길이: 25, 시작: 75 },
    ]);
  });

  it('0 인 조각은 그리지 않고 전부 0 이면 빈 배열이다', () => {
    expect(도넛조각(건(3, 0, 1)).map((조각) => 조각.종류)).toEqual(['p', 'n']);
    expect(도넛조각(건(0, 0, 0))).toEqual([]);
  });

  it('안쪽 고리는 직전 통과 몫이고 직전이 비면 null 이다', () => {
    expect(안쪽고리길이(건(30, 10, 0))).toBe(75);
    expect(안쪽고리길이(건(0, 0, 0))).toBeNull();
  });
});

describe('글자 조각', () => {
  it('흐름 글자는 막대 규칙의 클래스 글자로 옮긴다', () => {
    expect((['P', 'F', 'N'] as const).map(흐름글자)).toEqual(['p', 'f', 'n']);
  });

  it('날짜는 월/일이다', () => {
    expect(날짜글자('2026-10-07')).toBe('10/7');
  });
});
