// 페이지 성능 k6 browser 스크립트 — 단독 측정(PAGE 일)과 부하 중 측정(LOAD 스크립트의 브라우저 시나리오) (도메인/성능 §3.9 「페이지 성능」)
// 사람이 고른 경로는 JSON 글자로만 넣는다. 한 번 열 때마다 `QAHUB_PAGE <JSON>` 한 줄을 내고 에이전트가 그 줄을 1초 숫자에 싣는다(§5.4)

import type { PageSetup } from './types.js';

// 목표는 AI 추천 기본값으로 고정한다 — Core Web Vitals 「좋음」 (§3.9 「성능 목표」 · PERF-F1-07 시작 질문)
export const 페이지목표 = { LCP: 2500, FCP: 1800, CLS: 0.1 } as const;
export const 단독횟수 = 3;
export const 부하중브라우저 = 2;
export const 부하중간격초 = 30;

// 한 번 여는 데 30초(goto) + 기다림을 넉넉히 40초로 센다. 로그인 몫 60초
export const 단독시간 = (페이지수: number): number => 60 + 페이지수 * 단독횟수 * 40;

// 디바이스는 Lighthouse 기본값을 따른다 — 모바일은 moto g power, PC 는 1350×940
const 디바이스 = {
  desktop: {
    viewport: { width: 1350, height: 940 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  },
  mobile: {
    viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  },
};

// Lighthouse 모바일 기본 — 지연 150ms · 내려받기 1,638.4Kbps · 올리기 750Kbps. k6 throttleNetwork 는 초당 바이트다
const 망 = { NONE: null, SLOW_4G: { latency: 150, download: 209_715, upload: 96_000 } };

// 브라우저 안에서 도는 셈. CLS 는 세션 창 없이 입력 없는 이동을 모두 더한다
// ponytail: CLS 세션 창(5초 · 1초 틈) 대신 단순 합 — 한 번 여는 측정이라 차이가 작다. 긴 페이지에서 어긋나면 창을 센다
const 몸통 = String.raw`
const BASE = (__ENV.BASE_URL || '').replace(/\/$/, '');

function collect() {
  return new Promise((resolve) => {
    let lcp = null;
    let cls = 0;
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) lcp = e; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (_) {}
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch (_) {}
    setTimeout(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      const short = (u) => { try { const x = new URL(u); return (x.host === location.host ? '' : x.host) + x.pathname; } catch (_) { return String(u); } };
      const kind = (r) => {
        const t = r.initiatorType;
        if (t === 'fetch' || t === 'xmlhttprequest') return 'api';
        if (t === 'img' || t === 'image') return 'img';
        if (t === 'script') return 'script';
        if (/\.css(\?|$)/.test(r.name)) return 'css';
        if (/\.(woff2?|ttf|otf)(\?|$)/.test(r.name)) return 'font';
        return 'other';
      };
      let el = null;
      if (lcp && lcp.url) el = 'img ' + short(lcp.url).split('/').pop();
      else if (lcp && lcp.element) el = lcp.element.tagName.toLowerCase() + (lcp.element.id ? '#' + lcp.element.id : '');
      const res = performance.getEntriesByType('resource').slice(0, 99).map((r) => ({
        name: short(r.name).slice(-200), type: kind(r), startMs: Math.round(r.startTime), durationMs: Math.round(r.duration), bytes: r.transferSize || r.encodedBodySize || 0,
      }));
      if (nav) res.unshift({ name: location.pathname.slice(-200), type: 'document', startMs: 0, durationMs: Math.round(nav.responseEnd), bytes: nav.transferSize || 0 });
      resolve({
        lcpMs: lcp ? Math.round(lcp.startTime) : null, fcpMs: fcp ? Math.round(fcp.startTime) : null, cls: Math.round(cls * 1000) / 1000,
        ttfbMs: nav ? Math.round(nav.responseStart) : null, lcpElement: el ? el.slice(0, 200) : null, resources: res,
      });
    }, 200);
  });
}

// 한 번 열 때마다 새 문맥이다 — 앞서 연 것의 캐시가 다음 값을 낮추지 않게
async function measureOnce(p, cookies) {
  const ctx = await browser.newContext(PAGE_DEVICE);
  if (cookies.length > 0) await ctx.addCookies(cookies);
  const page = await ctx.newPage();
  try {
    if (PAGE_NETWORK) await page.throttleNetwork(PAGE_NETWORK);
    await page.goto(BASE + p.url, { waitUntil: 'load', timeout: 30000 });
    // 큰 이미지가 load 뒤에 그려지면 LCP 후보가 바뀐다
    await page.waitForTimeout(1000);
    const m = await page.evaluate(collect);
    console.log('QAHUB_PAGE ' + JSON.stringify(Object.assign({ url: p.url }, m)));
  } catch (e) {
    console.log('QAHUB_FAIL ' + JSON.stringify({ url: p.url, why: String((e && e.message) || e).slice(0, 300) }));
  } finally {
    await page.close();
    await ctx.close();
  }
}

// 비밀번호 칸과 그 바로 앞 입력 칸에 대상 서버 테스트 계정을 넣고 Enter (PERF-F1-07 시작 질문). 쿠키만 다음 문맥에 옮긴다
async function loginCookies() {
  if (!PAGE_LOGIN_URL || !PAGE_LIST.some((p) => p.login)) return [];
  const ctx = await browser.newContext(PAGE_DEVICE);
  const page = await ctx.newPage();
  try {
    await page.goto(BASE + PAGE_LOGIN_URL, { waitUntil: 'networkidle', timeout: 30000 });
    const pw = page.locator('input[type="password"]');
    const id = page.locator('//input[@type="password"]/preceding::input[not(@type="hidden") and not(@type="checkbox") and not(@type="radio") and not(@type="submit") and not(@type="button")][1]');
    await id.fill(__ENV.ACCOUNT_ID || '');
    await pw.fill(__ENV.ACCOUNT_PW || '');
    await Promise.all([page.waitForNavigation({ timeout: 15000 }).catch(() => null), pw.press('Enter')]);
    await page.waitForTimeout(1000);
    return await ctx.cookies();
  } catch (e) {
    console.log('QAHUB_FAIL ' + JSON.stringify({ url: PAGE_LOGIN_URL, why: '로그인하지 못했습니다 — ' + String((e && e.message) || e).slice(0, 300) }));
    return [];
  } finally {
    await page.close();
    await ctx.close();
  }
}
`;

function 상수(s: PageSetup): string {
  return [
    `const PAGE_LIST = ${JSON.stringify(s.pages.map((p) => ({ url: p.url, login: p.login })))};`,
    `const PAGE_DEVICE = ${JSON.stringify(디바이스[s.device])};`,
    `const PAGE_NETWORK = ${JSON.stringify(망[s.network])};`,
    `const PAGE_LOGIN_URL = ${JSON.stringify(s.loginUrl)};`,
  ].join('\n');
}

const 브라우저 = { browser: { type: 'chromium' } };

/** 단독 측정 — 로그인 없는 페이지부터 재고, 그다음 한 번 로그인해 나머지를 잰다. 페이지마다 세 번 */
export function 단독스크립트(s: PageSetup): string {
  const options = {
    scenarios: { pages: { executor: 'shared-iterations', vus: 1, iterations: 1, maxDuration: `${단독시간(s.pages.length)}s`, options: 브라우저 } },
    summaryTrendStats: [],
  };
  return `import { browser } from 'k6/browser';

${상수(s)}
export const options = ${JSON.stringify(options)};
${몸통}
export default async function () {
  for (const p of PAGE_LIST.filter((x) => !x.login)) for (let i = 0; i < ${단독횟수}; i++) await measureOnce(p, []);
  const need = PAGE_LIST.filter((x) => x.login);
  if (need.length === 0) return;
  const cookies = await loginCookies();
  for (const p of need) for (let i = 0; i < ${단독횟수}; i++) await measureOnce(p, cookies);
}
`;
}

/** 부하 스크립트에 더하는 브라우저 시나리오 — 브라우저 2개가 고른 페이지를 30초마다 연다. 실행 구간으로 에이전트들에 나뉜다 */
export function 부하중시나리오(durationSec: number): unknown {
  return { executor: 'constant-vus', vus: 부하중브라우저, duration: `${durationSec}s`, exec: 'pageCheck', options: 브라우저 };
}

export function 부하중조각(s: PageSetup): { imports: string; body: string } {
  return {
    imports: `import { browser } from 'k6/browser';\nimport { setTimeout as wait } from 'k6/timers';`,
    body: `${상수(s)}
${몸통}
let pageCookies = null;
export async function pageCheck() {
  const t0 = Date.now();
  if (pageCookies === null) pageCookies = await loginCookies();
  for (const p of PAGE_LIST) await measureOnce(p, p.login ? pageCookies : []);
  const rest = ${부하중간격초 * 1000} - (Date.now() - t0);
  if (rest > 0) await new Promise((r) => wait(r, rest));
}
`,
  };
}
