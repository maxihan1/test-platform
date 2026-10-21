// 페이지 측정 셈 검사 — 가운데 값 · 판정 · 목표 줄 · 생성한 브라우저 스크립트

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { 결과다듬기 } from './ai.js';
import { generateScript } from './generator.js';
import { 단독스크립트, 브라우저몫 } from './pageScript.js';
import { 정기실행재료 } from './schedule.js';
import { 가운데값, 목표줄들, 페이지판정, type 페이지표본 } from './pageStats.js';
import type { PageSetup } from './types.js';

const 표본 = (url: string, lcpMs: number | null, fcpMs: number | null, cls: number | null, 이름 = 'x'): 페이지표본 => ({
  url, lcpMs, fcpMs, cls, ttfbMs: 100, lcpElement: 이름, resources: [{ name: 이름, type: 'img', startMs: 0, durationMs: lcpMs ?? 0, bytes: 1 }],
});

const 설정: PageSetup = { pages: [{ url: '/', name: '메인', login: false }, { url: '/cart', name: '장바구니', login: true }], device: 'mobile', network: 'SLOW_4G', loginUrl: '/login' };

// 생성한 스크립트가 JS 로 읽히는가 — k6 가 켜지자마자 문법 오류로 끝나지 않게
const 문법오류 = (src: string) => {
  const f = ts.createSourceFile('script.js', src, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
  return (f as unknown as { parseDiagnostics: ts.Diagnostic[] }).parseDiagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
};

describe('가운데값', () => {
  it('경로마다 지표를 따로 가운데 값으로 줄이고 워터폴은 LCP 가 가운데 값에 가장 가까운 표본 것이다', () => {
    const rows = 가운데값([표본('/', 3000, 900, 0.3, '느림'), 표본('/a', 500, 400, 0), 표본('/', 1000, 700, 0.01, '빠름'), 표본('/', 1200, 800, 0.02, '가운데')]);
    expect(rows.map((r) => r.url)).toEqual(['/', '/a']);
    expect(rows[0]).toMatchObject({ lcpMs: 1200, fcpMs: 800, cls: 0.02, lcpElement: '가운데' });
  });

  it('값이 없는 표본은 빼고 센다 — 다 없으면 null', () => {
    expect(가운데값([표본('/', null, 500, null), 표본('/', 2000, 700, null)])[0]).toMatchObject({ lcpMs: 2000, fcpMs: 600, cls: null });
  });
});

describe('페이지판정 · 목표줄들', () => {
  it('LCP 2.5초 · FCP 1.8초 · CLS 0.1 을 모두 지켜야 통과다. 값이 없으면 실패', () => {
    expect(페이지판정({ lcpMs: 2500, fcpMs: 1800, cls: 0.1 })).toBe('PASS');
    expect(페이지판정({ lcpMs: 2501, fcpMs: 100, cls: 0 })).toBe('FAIL');
    expect(페이지판정({ lcpMs: 100, fcpMs: 100, cls: 0.18 })).toBe('FAIL');
    expect(페이지판정({ lcpMs: 100, fcpMs: null, cls: 0 })).toBe('FAIL');
  });

  it('페이지마다 세 줄, scope 가 경로다', () => {
    const t = 목표줄들([{ url: '/p', lcpMs: 2900, fcpMs: 800, cls: 0.18 }]);
    expect(t).toEqual([
      { metric: 'LCP', scope: '/p', op: '<=', value: 2500, source: 'AI', measured: 2900, verdict: 'FAIL' },
      { metric: 'FCP', scope: '/p', op: '<=', value: 1800, source: 'AI', measured: 800, verdict: 'PASS' },
      { metric: 'CLS', scope: '/p', op: '<=', value: 0.1, source: 'AI', measured: 0.18, verdict: 'FAIL' },
    ]);
  });
});

describe('브라우저 스크립트', () => {
  it('단독 측정은 JS 로 읽히고 고른 페이지 · 디바이스 · 망 · 로그인 화면을 JSON 으로만 싣는다', () => {
    const src = 단독스크립트({ ...설정, pages: [{ url: "/q?x=');alert(1)//", name: '이상한', login: false }] });
    expect(문법오류(src)).toEqual([]);
    expect(src).toContain("import { browser } from 'k6/browser'");
    expect(src).toContain(`const PAGE_LIST = ${JSON.stringify([{ url: "/q?x=');alert(1)//", login: false }])};`);
    expect(src).toContain('"isMobile":true');
    expect(src).toContain('"latency":150');
    expect(src).toContain('const PAGE_LOGIN_URL = "/login";');
    expect(src).toContain("console.log('QAHUB_PAGE '");
  });

  it('부하 스크립트는 켰을 때만 브라우저 2개 시나리오를 더하고 스모크에는 넣지 않는다', () => {
    const 바탕 = { transactions: [{ name: '목록', method: 'GET' as const, url: '/api/items' }], load: { basis: 'VUS' as const, stages: [{ durationSec: 120, target: 10 }] }, allowedHosts: ['shop.test'], maxVus: 100 };
    const 켬 = generateScript({ ...바탕, smoke: false, pages: 설정 });
    expect(문법오류(켬)).toEqual([]);
    expect(켬).toContain('"pages":{"executor":"constant-vus","vus":2,"duration":"120s","exec":"pageCheck"');
    expect(켬).toContain('export async function pageCheck()');
    expect(generateScript({ ...바탕, smoke: true, pages: 설정 })).not.toContain('k6/browser');
    expect(generateScript({ ...바탕, smoke: false })).not.toContain('k6/browser');
  });
});

describe('브라우저몫 · 정기 실행', () => {
  it('브라우저 2개를 실행 구간 비율로 나눈다 — 합은 늘 2', () => {
    expect(브라우저몫([500])).toEqual([2]);
    expect(브라우저몫([500, 500])).toEqual([1, 1]);
    expect(브라우저몫([100, 100, 100]).reduce((a, b) => a + b, 0)).toBe(2);
  });

  it('정기 실행은 마법사에 저장한 부하 중 페이지 측정 값을 따른다', () => {
    const body = { load: { basis: 'VUS' as const, testType: 'LOAD' as const, stages: [{ durationSec: 60, target: 10 }] }, run: { agentIds: [1], pageCheck: true } };
    expect(정기실행재료(3, 'qa', body)).toMatchObject({ input: { pageCheck: true } });
    expect(정기실행재료(3, 'qa', { ...body, run: { agentIds: [1] } })).toMatchObject({ input: { pageCheck: false } });
  });
});

describe('AI 결과 모양', () => {
  it('SUGGEST_PAGES 는 / 로 시작하는 겹치지 않는 경로만 받는다', () => {
    const 좋음 = 결과다듬기('SUGGEST_PAGES', {}, { pages: [{ url: '/', name: '메인', login: false }], basis: [] });
    expect(좋음).toEqual({ output: { pages: [{ url: '/', name: '메인', login: false, why: '' }], basis: [] } });
    expect(결과다듬기('SUGGEST_PAGES', {}, { pages: [{ url: 'https://evil.test/', name: '밖', login: false }] })).toHaveProperty('error');
    expect(결과다듬기('SUGGEST_PAGES', {}, { pages: [{ url: '//evil.test/', name: '밖', login: false }] })).toHaveProperty('error');
  });

  it('ANALYZE_RUN 은 페이지별 항목을 더 받는다', () => {
    expect(결과다듬기('ANALYZE_RUN', {}, { title: '상세가 느림', items: ['LCP 지연'], pages: [{ url: '/p', items: ['이미지 1.9MB'] }] })).not.toHaveProperty('error');
  });
});
