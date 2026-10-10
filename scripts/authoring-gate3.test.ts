// 끝의 전체 3회 결과 파일 판정 검사 — Playwright json 리포터 모양(최상위 suites[].file · specs[].tests[].projectName)
import { describe, expect, it } from 'vitest';

import { 끝전체3회경고, 남은임시도우미 } from './authoring-gate3.js';

describe('남은 임시 도우미 (작성 §3.6 팬아웃 · 2026-10-04)', () => {
  it('공용으로 옮기지 않은 draft 파일이 남으면 경고한다', () => {
    expect(남은임시도우미(['mkt/components/header.component.ts', 'mkt/components/draft-cart.component.ts', 'mkt/MKT-FN-001.spec.ts'])).toBe(
      '⚠️ 공용으로 옮기지 않은 임시 도우미 1개 — mkt/components/draft-cart.component.ts',
    );
  });

  it('helpers 아래 draft 파일도 잡는다 — 옛 components 자리와 둘 다', () => {
    expect(남은임시도우미(['mkt/helpers/login.helper.ts', 'mkt/helpers/draft-cart.helper.ts', 'mkt/components/draft-pay.component.ts'])).toBe(
      '⚠️ 공용으로 옮기지 않은 임시 도우미 2개 — mkt/helpers/draft-cart.helper.ts · mkt/components/draft-pay.component.ts',
    );
  });

  it('없으면 null', () => {
    expect(남은임시도우미(['mkt/components/header.component.ts', 'mkt/helpers/login.helper.ts', 'mkt/pages/draft-list.page.ts'])).toBeNull();
  });
});

const 시작 = '2026-10-03T10:00:00.000Z';
const 뒤 = '2026-10-03T10:30:00.000Z';
const 앞수정 = Date.parse(시작) - 60_000;

/** 파일마다 데스크톱 결과를 상태 수만큼 담은 결과 글 하나 */
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
const 수정 = (...파일들: string[]) => Object.fromEntries(파일들.map((f) => [f, 앞수정]));

describe('끝의 전체 3회 경고 (작성 §3.6 · 2026-10-03)', () => {
  it('하나씩 · 파일마다 데스크톱 3회 · 실패 없음 · 고친 뒤 실행이면 경고 없음', () => {
    expect(끝전체3회경고([결과({ 'mkt/A.spec.ts': 셋, 'mkt/B.spec.ts': 셋 })], 수정('mkt/A.spec.ts', 'mkt/B.spec.ts'))).toBeNull();
  });

  it('하나씩 차례로 나눠 돈 덩어리 여럿을 합쳐 본다', () => {
    expect(끝전체3회경고([결과({ 'mkt/A.spec.ts': 셋 }), 결과({ 'mkt/B.spec.ts': 셋 })], 수정('mkt/A.spec.ts', 'mkt/B.spec.ts'))).toBeNull();
  });

  it('고친 파일만 뒤에 다시 돌렸으면 그 파일은 가장 늦은 결과로 본다 — 절차대로 하면 경고가 없다', () => {
    const 고친때 = Date.parse(시작) + 60_000;
    expect(
      끝전체3회경고(
        [결과({ 'mkt/A.spec.ts': 셋, 'mkt/B.spec.ts': ['expected', 'unexpected', 'expected'] }), 결과({ 'mkt/B.spec.ts': 셋 }, { startTime: 뒤 })],
        { 'mkt/A.spec.ts': 앞수정, 'mkt/B.spec.ts': 고친때 },
      ),
    ).toBeNull();
  });

  it('보류 케이스의 skipped 3회도 3회로 센다', () => {
    expect(끝전체3회경고([결과({ 'mkt/A.spec.ts': ['skipped', 'skipped', 'skipped'] })], 수정('mkt/A.spec.ts'))).toBeNull();
  });

  it('결과 파일이 없으면 경고', () => {
    expect(끝전체3회경고([], 수정('mkt/A.spec.ts'))).toMatch(/^⚠️ 끝의 전체 3회.*결과 파일이 없다/);
  });

  it('깨진 결과 파일이면 경고', () => {
    expect(끝전체3회경고(['{깨짐'], 수정('mkt/A.spec.ts'))).toMatch(/결과 파일을 못 읽었다/);
  });

  it('동시 실행이면 경고 — MKT 11208 은 --workers=3 이었다', () => {
    expect(끝전체3회경고([결과({ 'mkt/A.spec.ts': 셋 }, { workers: 3 })], 수정('mkt/A.spec.ts'))).toMatch(/동시 3개/);
  });

  it('빠진 파일 · 3회가 아닌 파일 · 실패를 센다', () => {
    const 말 = 끝전체3회경고(
      [결과({ 'mkt/A.spec.ts': ['expected'], 'mkt/B.spec.ts': ['expected', 'unexpected', 'expected'] })],
      수정('mkt/A.spec.ts', 'mkt/B.spec.ts', 'mkt/C.spec.ts'),
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
    expect(끝전체3회경고([글], 수정('mkt/A.spec.ts'))).toMatch(/빠진 파일 1개/);
  });

  it('하위 묶음(describe) 안의 결과도 위 파일 이름으로 센다', () => {
    const 글 = JSON.stringify({
      config: { workers: 1 },
      stats: { startTime: 시작 },
      suites: [{ file: 'mkt/A.spec.ts', suites: [{ specs: [0, 1, 2].map(() => ({ tests: [{ projectName: 'desktop', status: 'expected' }] })) }] }],
    });
    expect(끝전체3회경고([글], 수정('mkt/A.spec.ts'))).toBeNull();
  });

  it('그 파일이나 그것이 쓰는 Page Object 를 마지막 결과 뒤에 고쳤으면 경고', () => {
    expect(끝전체3회경고([결과({ 'mkt/A.spec.ts': 셋 })], { 'mkt/A.spec.ts': Date.parse(시작) + 60_000 })).toMatch(
      /마지막 실행 뒤에 고친 파일 1개/,
    );
  });
});
