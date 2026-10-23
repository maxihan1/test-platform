// 돌려 보기 명령 검사 — 무엇을 몇 번 돌릴지 · 차례 나누기 · 경로 · 기록 번호 · 빨강 요약 (작성 §3.6 「돌려 보기 명령」)
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { 돌린판 } from './authoring-gate3.js';
import { 기본회차, 다음번호, 돌릴기기, 빨강줄들, 실행, 줄열쇠, 차례나누기, 케이스경로, 할일고르기, 회차어림 } from './authoring-run3.js';

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
const 한기기 = (표: Record<string, 돌린판[]>) => (파일: string) => 표[파일];

describe('할일고르기 — 보조 AI', () => {
  it('고친 뒤 응답 늦추기로 3번 돌린 기록이 없으면 3번 — 빨강이어도 3번 돌렸으면 끝', () => {
    const 표 = 한기기({
      A: [판()],
      B: [판({ 상태들: ['expected', 'unexpected', 'expected'] })],
      C: [판({ 시작: 500 })],
      D: [판({ 느림: false })],
    });
    expect(할일고르기({ A: 수정, B: 수정, C: 수정, D: 수정, E: 수정 }, 표, '보조')).toEqual({ 셋: ['C', 'D', 'E'], 하나: [] });
  });
});

describe('할일고르기 — 마지막 전체 돌려 보기 (2026-10-19 사용자 — 보조 3번 + 마지막 1번)', () => {
  it('보조 AI 가 3번 다 초록이면 마지막 1번, 아니면 마지막 3번', () => {
    const 표 = 한기기({ A: [판()], B: [판({ 상태들: ['expected', 'unexpected', 'expected'] })] });
    expect(할일고르기({ A: 수정, B: 수정, C: 수정 }, 표, '마지막')).toEqual({ 셋: ['B', 'C'], 하나: ['A'] });
  });

  it('마지막 기록이 이미 있으면 빨강이어도 다시 고르지 않는다 — 늘 빨간 케이스를 끝없이 돌리지 않게', () => {
    const 끝1 = 판({ 끝: true, 시작: 3_000, 상태들: ['unexpected'] });
    const 끝3 = 판({ 끝: true, 시작: 3_000, 상태들: ['unexpected', 'unexpected', 'unexpected'] });
    expect(할일고르기({ A: 수정, B: 수정 }, 한기기({ A: [판(), 끝1], B: [끝3] }), '마지막')).toEqual({ 셋: [], 하나: [] });
  });

  it('보조 AI 가 돌린 뒤 고쳤으면 그 3번은 못 써 마지막 3번', () => {
    expect(할일고르기({ A: 수정 }, 한기기({ A: [판({ 시작: 500 })] }), '마지막').셋).toEqual(['A']);
  });

  it('기기마다 따로 고른다 — PC 는 보조 3번이 다 초록이라 1번, 휴대폰은 빨강이 섞여 3번', () => {
    const PC = 한기기({ A: [판()] });
    const 휴대폰 = 한기기({ A: [판({ 상태들: ['expected', 'unexpected', 'expected'] })] });
    expect(할일고르기({ A: 수정 }, PC, '마지막')).toEqual({ 셋: [], 하나: ['A'] });
    expect(할일고르기({ A: 수정 }, 휴대폰, '마지막')).toEqual({ 셋: ['A'], 하나: [] });
  });
});

describe('차례나누기 · 회차어림 · 다음번호 · 케이스경로', () => {
  it('앞에서부터 예산 안에 드는 만큼 — 하나도 안 들면 첫 파일 하나', () => {
    const 어림 = () => 1_000;
    expect(차례나누기(['A', 'B', 'C', 'D'], 3, 어림, 7_000)).toEqual(['A', 'B']);
    expect(차례나누기(['A', 'B'], 3, () => 10_000, 7_000)).toEqual(['A']);
    expect(차례나누기([], 1, 어림, 7_000)).toEqual([]);
  });

  it('그 파일 기록의 회차 평균 → 없으면 모든 기록 평균 → 그것도 없으면 기본값', () => {
    const 전체 = [판({ 시간들: [10_000] })];
    expect(회차어림([판({ 시간들: [2_000, 4_000] }), 판({ 시간들: [6_000] })], 전체)).toBe(4_000);
    expect(회차어림(undefined, 전체)).toBe(10_000);
    expect(회차어림(undefined, [])).toBe(기본회차);
  });

  it('같은 머리 기록의 다음 번호 — 휴대폰 기록도 같은 번호를 쓴다', () => {
    expect(다음번호(['gate3-final-1.json', 'gate3-final-2-mobile.json', 'gate3-part-shop-7.json', 'x.log'], 'gate3-final')).toBe(3);
    expect(다음번호([], 'gate3-part-shop')).toBe(1);
  });

  it('맡은 파일은 tests/ · ./tests/ · 절대 경로를 다 받고 tests 밖이면 null', () => {
    expect(케이스경로('/트리', 'tests/mkt/A.spec.ts')).toBe('mkt/A.spec.ts');
    expect(케이스경로('/트리', './tests/mkt/A.spec.ts')).toBe('mkt/A.spec.ts');
    expect(케이스경로('/트리', '/트리/tests/mkt/A.spec.ts')).toBe('mkt/A.spec.ts');
    expect(케이스경로('/트리', 'mkt/A.spec.ts')).toBeNull();
    expect(케이스경로('/트리', '../밖/tests/A.spec.ts')).toBeNull();
  });
});

describe('빨강줄들', () => {
  it('고친 뒤 가장 늦은 기록에서 빨간 회차 수와 첫 오류 줄 — 초록이거나 고치기 전 기록뿐이면 안 적는다', () => {
    const 표: Record<string, 돌린판[]> = {
      'A|desktop': [판({ 상태들: ['expected', 'unexpected', 'expected'], 오류: '기대: 15,000원' })],
      'A|mobile': [판()],
      'B|desktop': [판({ 상태들: ['unexpected'], 시작: 500 })],
      'C|desktop': [판({ 상태들: ['unexpected'], 오류: '앞 실패' }), 판({ 시작: 3_000 })],
    };
    expect(빨강줄들({ A: 수정, B: 수정, C: 수정 }, (f, 기기) => 표[`${f}|${기기}`], ['desktop', 'mobile'])).toEqual(['- A (PC 1/3): 기대: 15,000원']);
  });
});

describe('돌릴기기 — 쓰는 중 1번은 기기 하나 (PRD-F14-09)', () => {
  it('보조 3회 · 마지막은 --mobile 이면 휴대폰도 나란히, 1번은 --mobile 이어도 PC 하나 · --mobile-only 면 휴대폰 하나', () => {
    expect(돌릴기기('보조', true)).toEqual(['desktop', 'mobile']);
    expect(돌릴기기('마지막', true)).toEqual(['desktop', 'mobile']);
    expect(돌릴기기('한번', true)).toEqual(['desktop']);
    expect(돌릴기기('한번', false, true)).toEqual(['mobile']);
    expect(돌릴기기('보조', false)).toEqual(['desktop']);
  });
});

describe('줄열쇠 — 「남은 것」 뒤 다시 부르면 앞 차례를 잇는 열쇠 (PRD-F14-08)', () => {
  it('같은 작업 트리 · 묶음 · 기기면 같고, 트리나 기기가 다르면 다르다', () => {
    expect(줄열쇠('/work/a/tree', 'shop', 'desktop')).toBe(줄열쇠('/work/a/tree/', 'shop', 'desktop'));
    expect(줄열쇠('/work/a/tree', 'shop', 'desktop')).not.toBe(줄열쇠('/work/b/tree', 'shop', 'desktop'));
    expect(줄열쇠('/work/a/tree', 'shop', 'desktop')).not.toBe(줄열쇠('/work/a/tree', 'shop', 'mobile'));
    expect(줄열쇠('/work/a/tree', 'shop', 'desktop')).toMatch(/^[0-9a-f]{8}-shop-desktop$/);
  });
});

describe('실행 — 잘못 부르면 돌리지 않는다', () => {
  it('모드 · 묶음 이름이 틀리거나 맡은 파일이 없거나 기록 자리가 없으면 2', async () => {
    expect(await 실행(['보조', 'Shop Order', 'tests/mkt/A.spec.ts'], '/없는곳', { AUTHORING_GATE3_DIR: '/tmp' })).toBe(2);
    expect(await 실행(['보조', 'shop'], '/없는곳', { AUTHORING_GATE3_DIR: '/tmp' })).toBe(2);
    expect(await 실행(['다시', 'mkt'], '/없는곳', { AUTHORING_GATE3_DIR: '/tmp' })).toBe(2);
    expect(await 실행(['마지막', 'mkt'], '/없는곳', {})).toBe(2);
    expect(await 실행(['한번', 'shop'], '/없는곳', { AUTHORING_GATE3_DIR: '/tmp' })).toBe(2);
    expect(await 실행(['보조', 'shop', 'tests/mkt/A.spec.ts', '--trace'], '/없는곳', { AUTHORING_GATE3_DIR: '/tmp' })).toBe(2);
    expect(await 실행(['보조', 'shop', 'tests/mkt/A.spec.ts', '--mobile-only'], '/없는곳', { AUTHORING_GATE3_DIR: '/tmp' })).toBe(2);
  });

  it('대상 서버 주소(PLATFORM_BASE_URL)가 없으면 브라우저를 띄우기 전에 2 — 회차마다 Invalid URL 로 빨개지지 않게', async () => {
    const 트리 = mkdtempSync(join(tmpdir(), 'run3-'));
    mkdirSync(join(트리, 'tests', 'mkt'), { recursive: true });
    writeFileSync(join(트리, 'tests', 'mkt', 'A.spec.ts'), '');
    const 기록 = mkdtempSync(join(tmpdir(), 'run3-기록-'));
    for (const 모드 of ['보조', '한번']) expect(await 실행([모드, 'shop', 'tests/mkt/A.spec.ts'], 트리, { AUTHORING_GATE3_DIR: 기록 })).toBe(2);
  });

  it('tests 밖이거나 없는 케이스 파일을 주면 아무것도 안 돌리고 2 — 「돌릴 것 없음」 성공으로 넘어가지 않게', async () => {
    const 트리 = mkdtempSync(join(tmpdir(), 'run3-'));
    mkdirSync(join(트리, 'tests', 'mkt'), { recursive: true });
    writeFileSync(join(트리, 'tests', 'mkt', 'A.spec.ts'), '');
    const 기록 = mkdtempSync(join(tmpdir(), 'run3-기록-'));
    expect(await 실행(['보조', 'shop', 'mkt/A.spec.ts'], 트리, { AUTHORING_GATE3_DIR: 기록 })).toBe(2);
    expect(await 실행(['보조', 'shop', 'tests/mkt/없음.spec.ts'], 트리, { AUTHORING_GATE3_DIR: 기록 })).toBe(2);
  });

  it('마지막은 에이전트가 넘긴 기준 목록(AUTHORING_BASE_LIST)으로 바뀐 파일을 센다 — .git 없는 사본 트리에서 늘 2 가 되지 않게 (리뷰 M19)', async () => {
    const 트리 = mkdtempSync(join(tmpdir(), 'run3-'));
    mkdirSync(join(트리, 'tests', 'mkt'), { recursive: true });
    const 기록 = mkdtempSync(join(tmpdir(), 'run3-기록-'));
    const 목록 = join(기록, 'tests-base.z');
    writeFileSync(목록, '');
    expect(await 실행(['마지막', 'mkt'], 트리, { AUTHORING_GATE3_DIR: 기록 })).toBe(2);
    expect(await 실행(['마지막', 'mkt'], 트리, { AUTHORING_GATE3_DIR: 기록, AUTHORING_BASE_LIST: 목록 })).toBe(0);
  });
});
