// 돌려 보기 명령 검사 — 무엇을 몇 번 돌릴지 · 차례 나누기 · 기록 번호 · 빨강 요약 (작성 §3.6 「돌려 보기 명령」)
import { describe, expect, it } from 'vitest';

import type { 돌린판 } from './authoring-gate3.js';
import { 기본회차, 다음번호, 빨강줄들, 실행, 차례나누기, 할일고르기, 회차어림 } from './authoring-run3.js';

const 수정 = 1_000;
const 판 = (덧: Partial<돌린판> = {}): 돌린판 => ({
  기록: 'gate3-part-shop-1.json',
  시작: 2_000,
  느림: true,
  끝: false,
  상태들: ['expected', 'expected', 'expected'],
  시간들: [],
  오류: null,
  ...덧,
});
const 기록표 = (표: Record<string, 돌린판[]>) => (파일: string, 기기: string) => 표[`${파일}|${기기}`];

describe('할일고르기 — 보조 AI', () => {
  it('고친 뒤 응답 늦추기로 3번 돌린 기록이 없으면 3번 — 빨강이어도 3번 돌렸으면 끝', () => {
    const 표 = 기록표({
      'A|desktop': [판()],
      'B|desktop': [판({ 상태들: ['expected', 'unexpected', 'expected'] })],
      'C|desktop': [판({ 시작: 500 })],
      'D|desktop': [판({ 느림: false })],
    });
    expect(할일고르기({ A: 수정, B: 수정, C: 수정, D: 수정, E: 수정 }, 표, ['desktop'], '보조')).toEqual({ 셋: ['C', 'D', 'E'], 하나: [] });
  });

  it('휴대폰도 돌리면 두 기기 다 3번 돌렸어야 끝', () => {
    const 표 = 기록표({ 'A|desktop': [판()], 'A|mobile': [판({ 상태들: ['expected'] })] });
    expect(할일고르기({ A: 수정 }, 표, ['desktop', 'mobile'], '보조').셋).toEqual(['A']);
  });
});

describe('할일고르기 — 마지막 전체 돌려 보기 (2026-10-19 사용자 — 보조 3번 + 마지막 1번)', () => {
  it('보조 AI 가 3번 다 초록이면 마지막 1번, 아니면 마지막 3번', () => {
    const 표 = 기록표({ 'A|desktop': [판()], 'B|desktop': [판({ 상태들: ['expected', 'unexpected', 'expected'] })] });
    expect(할일고르기({ A: 수정, B: 수정, C: 수정 }, 표, ['desktop'], '마지막')).toEqual({ 셋: ['B', 'C'], 하나: ['A'] });
  });

  it('마지막 기록이 이미 있으면 빨강이어도 다시 고르지 않는다 — 늘 빨간 케이스를 끝없이 돌리지 않게', () => {
    const 끝1 = 판({ 끝: true, 시작: 3_000, 상태들: ['unexpected'] });
    const 끝3 = 판({ 끝: true, 시작: 3_000, 상태들: ['unexpected', 'unexpected', 'unexpected'] });
    const 표 = 기록표({ 'A|desktop': [판(), 끝1], 'B|desktop': [끝3] });
    expect(할일고르기({ A: 수정, B: 수정 }, 표, ['desktop'], '마지막')).toEqual({ 셋: [], 하나: [] });
  });

  it('보조 AI 가 돌린 뒤 고쳤으면 그 3번은 못 써 마지막 3번', () => {
    const 표 = 기록표({ 'A|desktop': [판({ 시작: 500 })] });
    expect(할일고르기({ A: 수정 }, 표, ['desktop'], '마지막').셋).toEqual(['A']);
  });

  it('PC 는 초록 3번인데 휴대폰 3번에 빨강이 섞였으면 둘 다 마지막 3번', () => {
    const 표 = 기록표({ 'A|desktop': [판()], 'A|mobile': [판({ 상태들: ['expected', 'unexpected', 'expected'] })] });
    expect(할일고르기({ A: 수정 }, 표, ['desktop', 'mobile'], '마지막')).toEqual({ 셋: ['A'], 하나: [] });
  });
});

describe('차례나누기 · 회차어림 · 다음번호', () => {
  it('앞에서부터 예산 안에 드는 만큼 — 하나도 안 들면 첫 파일 하나', () => {
    const 어림 = () => 1_000;
    expect(차례나누기(['A', 'B', 'C', 'D'], 3, 어림, 7_000)).toEqual(['A', 'B']);
    expect(차례나누기(['A', 'B'], 3, () => 10_000, 7_000)).toEqual(['A']);
    expect(차례나누기([], 1, 어림, 7_000)).toEqual([]);
  });

  it('앞 기록의 회차 평균, 없으면 기본값', () => {
    expect(회차어림([판({ 시간들: [2_000, 4_000] }), 판({ 시간들: [6_000] })])).toBe(4_000);
    expect(회차어림(undefined)).toBe(기본회차);
  });

  it('같은 머리 기록의 다음 번호 — 휴대폰 기록도 같은 번호를 쓴다', () => {
    expect(다음번호(['gate3-final-1.json', 'gate3-final-2-mobile.json', 'gate3-part-shop-7.json', 'x.log'], 'gate3-final')).toBe(3);
    expect(다음번호([], 'gate3-part-shop')).toBe(1);
  });
});

describe('빨강줄들', () => {
  it('고친 뒤 가장 늦은 기록에서 빨간 회차 수와 첫 오류 줄 — 초록이거나 고치기 전 기록뿐이면 안 적는다', () => {
    const 표 = 기록표({
      'A|desktop': [판({ 상태들: ['expected', 'unexpected', 'expected'], 오류: '기대: 15,000원' })],
      'A|mobile': [판()],
      'B|desktop': [판({ 상태들: ['unexpected'], 시작: 500 })],
      'C|desktop': [판({ 상태들: ['unexpected'], 오류: '앞 실패' }), 판({ 시작: 3_000 })],
    });
    expect(빨강줄들({ A: 수정, B: 수정, C: 수정 }, 표, ['desktop', 'mobile'])).toEqual(['- A (PC 1/3): 기대: 15,000원']);
  });
});

describe('실행 — 잘못 부르면 돌리지 않는다', () => {
  it('모드 · 묶음 이름이 틀리거나 기록 자리가 없으면 2', async () => {
    expect(await 실행(['보조', 'Shop Order', 'mkt/A.spec.ts'], '/없는곳', { AUTHORING_GATE3_DIR: '/tmp' })).toBe(2);
    expect(await 실행(['다시', 'mkt'], '/없는곳', { AUTHORING_GATE3_DIR: '/tmp' })).toBe(2);
    expect(await 실행(['마지막', 'mkt'], '/없는곳', {})).toBe(2);
  });
});
