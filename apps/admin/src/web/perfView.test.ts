// 성능 마법사 계산 검사 — 유형별 구간 · 피크 산정 · 그래프 점 · 넘길 까닭 (도메인/성능 §3.9 「부하 설정」)

import { describe, expect, it } from 'vitest';

import { 계정행수 } from './PerfStepRun.js';
import { 구간만들기, 그래프점, 넘길까닭, 저장값, 총초, 최대목표, 피크계산, 화면값 } from './perfView.js';

describe('유형을 고르면 구간을 채운다', () => {
  it('부하 테스트는 램프업 → 유지 → 내리기다', () => {
    expect(구간만들기('LOAD', { maxVus: 200, rampMin: 5, holdMin: 10 })).toEqual([
      { durationSec: 300, target: 200 },
      { durationSec: 600, target: 200 },
      { durationSec: 60, target: 0 },
    ]);
  });

  it('스트레스 테스트는 피크에 머문 뒤 최대까지 램프업한다. 피크를 모르면 최대의 1/5 이다', () => {
    expect(구간만들기('STRESS', { maxVus: 2000, rampMin: 30, holdMin: 0, peakVus: 400 })).toEqual([
      { durationSec: 300, target: 400 },
      { durationSec: 180, target: 400 },
      { durationSec: 1800, target: 2000 },
    ]);
    expect(구간만들기('STRESS', { maxVus: 500, rampMin: 10, holdMin: 0 })[0]?.target).toBe(100);
  });

  it('스파이크 테스트는 10초 안에 최대로 올랐다 기준으로 돌아온다', () => {
    const s = 구간만들기('SPIKE', { maxVus: 1000, rampMin: 1, holdMin: 1 });
    expect(s.map((x) => x.target)).toEqual([100, 1000, 1000, 100, 100]);
    expect(s[1]?.durationSec).toBe(10);
  });

  it('내구성 테스트는 램프업 뒤 목표를 오래 유지한다', () => {
    expect(구간만들기('SOAK', { maxVus: 300, rampMin: 10, holdMin: 240 })).toEqual([
      { durationSec: 600, target: 300 },
      { durationSec: 14_400, target: 300 },
    ]);
  });

  it('전체 시간과 최대 목표를 센다', () => {
    const s = 구간만들기('LOAD', { maxVus: 50, rampMin: 1, holdMin: 2 });
    expect(총초(s)).toBe(240);
    expect(최대목표(s)).toBe(50);
  });
});

describe('피크 동시 사용자 = 일 방문자 × 피크 집중률 × 평균 체류 ÷ 피크 시간', () => {
  it('시안의 예 — 30,000명 × 20% × 4분 ÷ 60분은 400명이다', () => {
    expect(피크계산(30_000, 0.2, 4, 60)).toBe(400);
  });

  it('세 값 중 하나라도 없으면 셈하지 않는다 — 화면이 그 칸을 묻는다', () => {
    expect(피크계산(null, 0.2, 4)).toBeNull();
    expect(피크계산(30_000, 0.2, null)).toBeNull();
  });
});

it('그래프 점은 0초 0명에서 시작해 구간 끝마다 하나다', () => {
  expect(그래프점([{ durationSec: 50, target: 10 }, { durationSec: 50, target: 10 }], 100, 40)).toBe('0,40 50,4 100,4');
});

it('95% 응답시간은 화면이 초로, 저장은 ms 로 한다', () => {
  expect(화면값({ metric: 'P95', op: '<=', value: 2000, source: 'MANUAL' })).toBe(2);
  expect(저장값('P95', 1.5)).toBe(1500);
  expect(저장값('ERROR_RATE', 1)).toBe(1);
});

describe('다음 단계로 못 넘기는 까닭', () => {
  const 값 = { name: '주문하기', txCount: 1, dummy: false, stages: [{ durationSec: 60, target: 10 }] };

  it('이름이 비거나 트랜잭션이 없으면 1단계에서 막는다', () => {
    expect(넘길까닭(1, { ...값, name: ' ' }, 'ko')).toBe('시나리오 이름을 적어 주세요');
    expect(넘길까닭(1, { ...값, txCount: 0 }, 'ko')).toBe('트랜잭션이 하나도 없습니다. 가져오거나 추가해 주세요');
    expect(넘길까닭(1, 값, 'ko')).toBeNull();
  });

  it('가상 사용자가 0명이면 2단계에서 막는다', () => {
    expect(넘길까닭(2, { ...값, stages: [{ durationSec: 60, target: 0 }] }, 'ko')).toBe('가상 사용자가 0명입니다. 최대 가상 사용자를 적어 주세요');
  });
});

it('계정 CSV 의 첫 줄이 머리면 빼고 센다 — 서버와 같은 규칙이다', () => {
  expect(계정행수('id,password\nu1,p1\nu2,p2\n')).toBe(2);
  expect(계정행수('u1,p1\n\nu2,p2')).toBe(2);
});
