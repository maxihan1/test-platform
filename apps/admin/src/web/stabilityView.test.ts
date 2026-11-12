// 안정화 지표 화면 판단 검사 — 발생 케이스 글 · 추이 그래프 좌표 · 날짜 글자 (도메인/안정화 §8.19)

import { describe, expect, it } from 'vitest';

import type { 추이점 } from './stabilityApi.js';
import { PC틀, 날짜보임, 최초발생글, 추이그림, 케이스글 } from './stabilityView.js';

const 점 = (day: string, residual: number, newErrors: number): 추이점 => ({ day, runId: Number(day.slice(8)), residual, newErrors, buildNo: null, buildChanged: false });

describe('발생 케이스 글', () => {
  it('셋 이상이면 첫 번호 외 N건, 둘이면 같은 앞부분을 한 번만 쓴다', () => {
    expect(케이스글([])).toEqual(['—', 0]);
    expect(케이스글(['ARG-FN-112'])).toEqual(['ARG-FN-112', 0]);
    expect(케이스글(['ARG-FN-207', 'ARG-FN-208'])).toEqual(['ARG-FN-207 · 208', 0]);
    expect(케이스글(['ARG-FN-207', 'ARG-UI-001'])).toEqual(['ARG-FN-207 · ARG-UI-001', 0]);
    expect(케이스글(['ARG-FN-112', 'ARG-FN-113', 'ARG-FN-114', 'ARG-FN-115'])).toEqual(['ARG-FN-112', 3]);
  });

  it('최초 발생은 날짜와 빌드, 빌드가 없으면 날짜만', () => {
    expect(최초발생글('2026-11-12', '22')).toBe('11-12 · #22');
    expect(최초발생글('2026-11-12', null)).toBe('11-12');
  });
});

describe('추이 그래프', () => {
  it('꼭대기는 가장 큰 값보다 높은 3의 배수이고 눈금은 넷이다', () => {
    const 그림 = 추이그림([점('2026-11-06', 9, 0), 점('2026-11-07', 11, 2)], PC틀);
    expect(그림.눈금.map((눈) => 눈.값)).toEqual([12, 8, 4, 0]);
    expect(그림.눈금[0]!.y).toBe(PC틀.위);
    expect(그림.눈금[3]!.y).toBe(PC틀.바닥);
  });

  it('첫 점과 끝 점이 판 양끝에 서고, 선은 그 사이를 곡선으로 잇고, 면은 바닥에서 닫힌다', () => {
    const 그림 = 추이그림([점('2026-11-06', 6, 0), 점('2026-11-07', 3, 1), 점('2026-11-08', 0, 0)], PC틀);
    expect(그림.점.map((p) => p.x)).toEqual([PC틀.왼, (PC틀.왼 + PC틀.오른) / 2, PC틀.오른]);
    expect(그림.선.startsWith(`M${PC틀.왼.toFixed(1)} `)).toBe(true);
    expect(그림.선.match(/C/g)).toHaveLength(2);
    expect(그림.면.endsWith(`L${PC틀.왼.toFixed(1)} ${PC틀.바닥.toFixed(1)} Z`)).toBe(true);
    // 0 은 바닥에 선다
    expect(그림.점[2]!.y).toBe(PC틀.바닥);
  });

  it('점이 하나면 가운데에 서고, 오류가 하나도 없어도 눈금이 선다', () => {
    const 그림 = 추이그림([점('2026-11-12', 0, 0)], PC틀);
    expect(그림.점[0]!.x).toBe((PC틀.왼 + PC틀.오른) / 2);
    expect(그림.눈금.map((눈) => 눈.값)).toEqual([3, 2, 1, 0]);
  });

  it('날짜 글자 — 7일은 다 쓰고, 30일은 마지막 날부터 거꾸로 같은 간격, 휴대폰은 처음 · 가운데 · 끝', () => {
    expect([0, 1, 2, 3, 4, 5, 6].every((i) => 날짜보임(i, 7, false))).toBe(true);
    const 서른 = Array.from({ length: 30 }, (_, i) => i).filter((i) => 날짜보임(i, 30, false));
    expect(서른.at(-1)).toBe(29);
    expect(서른.length).toBeLessThanOrEqual(8);
    expect([0, 1, 2, 3, 4, 5, 6].filter((i) => 날짜보임(i, 7, true))).toEqual([0, 3, 6]);
  });
});
