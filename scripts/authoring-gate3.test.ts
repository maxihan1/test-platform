// 끝의 전체 3회 결과 파일 판정 검사 — Playwright json 리포터 모양(최상위 suites[].file · specs[].tests[].projectName)
import { describe, expect, it } from 'vitest';

import { 끝전체3회경고 } from './authoring-gate3.js';

const 시작 = '2026-10-03T10:00:00.000Z';
const 나중 = Date.parse(시작) - 60_000;

/** 파일마다 데스크톱 결과를 n 회 담은 결과 글 하나 */
const 결과 = (파일들: Record<string, string[]>, 덧: { workers?: number; startTime?: string } = {}) =>
  JSON.stringify({
    config: { workers: 덧.workers ?? 1 },
    stats: { startTime: 덧.startTime ?? 시작 },
    suites: Object.entries(파일들).map(([file, 상태들]) => ({
      file,
      specs: 상태들.map((status) => ({ file: '../packages/kit/src/runtime/test.ts', tests: [{ projectName: 'desktop', status }] })),
    })),
  });

const 셋 = ['expected', 'expected', 'expected'];

describe('끝의 전체 3회 경고 (작성 §3.6 · 2026-10-03)', () => {
  it('하나씩 · 파일마다 데스크톱 3회 · 실패 없음 · 고친 뒤 실행이면 경고 없음', () => {
    expect(끝전체3회경고([결과({ 'mkt/A.spec.ts': 셋, 'mkt/B.spec.ts': 셋 })], ['mkt/A.spec.ts', 'mkt/B.spec.ts'], 나중)).toBeNull();
  });

  it('하나씩 차례로 나눠 돈 덩어리 여럿을 합쳐 본다', () => {
    expect(끝전체3회경고([결과({ 'mkt/A.spec.ts': 셋 }), 결과({ 'mkt/B.spec.ts': 셋 })], ['mkt/A.spec.ts', 'mkt/B.spec.ts'], 나중)).toBeNull();
  });

  it('보류 케이스의 skipped 3회도 3회로 센다', () => {
    expect(끝전체3회경고([결과({ 'mkt/A.spec.ts': ['skipped', 'skipped', 'skipped'] })], ['mkt/A.spec.ts'], 나중)).toBeNull();
  });

  it('결과 파일이 없으면 경고', () => {
    expect(끝전체3회경고([], ['mkt/A.spec.ts'], 나중)).toMatch(/^⚠️ 끝의 전체 3회.*결과 파일이 없다/);
  });

  it('깨진 결과 파일이면 경고', () => {
    expect(끝전체3회경고(['{깨짐'], ['mkt/A.spec.ts'], 나중)).toMatch(/결과 파일을 못 읽었다/);
  });

  it('동시 실행이면 경고 — MKT 11208 은 --workers=3 이었다', () => {
    expect(끝전체3회경고([결과({ 'mkt/A.spec.ts': 셋 }, { workers: 3 })], ['mkt/A.spec.ts'], 나중)).toMatch(/동시 3개/);
  });

  it('빠진 파일 · 3회가 아닌 파일 · 실패를 센다', () => {
    const 말 = 끝전체3회경고(
      [결과({ 'mkt/A.spec.ts': ['expected'], 'mkt/B.spec.ts': ['expected', 'unexpected', 'expected'] })],
      ['mkt/A.spec.ts', 'mkt/B.spec.ts', 'mkt/C.spec.ts'],
      나중,
    );
    expect(말).toMatch(/빠진 파일 1개/);
    expect(말).toMatch(/3회가 아닌 파일 1개/);
    expect(말).toMatch(/실패 1회/);
  });

  it('모바일 결과는 세지 않는다 — 데스크톱만', () => {
    const 글 = JSON.stringify({
      config: { workers: 1 },
      stats: { startTime: 시작 },
      suites: [{ file: 'mkt/A.spec.ts', specs: [0, 1, 2].map(() => ({ tests: [{ projectName: 'mobile', status: 'expected' }] })) }],
    });
    expect(끝전체3회경고([글], ['mkt/A.spec.ts'], 나중)).toMatch(/빠진 파일 1개/);
  });

  it('마지막 실행 뒤에 케이스를 고쳤으면 경고 — 결과가 옛 코드 기준이다', () => {
    expect(끝전체3회경고([결과({ 'mkt/A.spec.ts': 셋 })], ['mkt/A.spec.ts'], Date.parse(시작) + 60_000)).toMatch(/실행 뒤에 케이스를 고쳤다/);
  });
});
