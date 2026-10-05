// 케이스 목록 줄 배치를 브라우저로 잰다 — 칸 겹침 · 넘침 · 판정 집계 글자 · 입력 칸 폭 · 실행 기록 표머리 (PR #159)
// jsdom 은 폭을 못 잰다(LEARNINGS 2026-09-22 · 09-30). 화면 개발 서버를 띄우고 예시 응답으로 연다 — 관리 서버 · DB 는 안 쓴다
//   npx vite --config apps/admin/src/web/vite.config.ts --port 5199 --strictPort   (다른 창)
//   node scripts/case-list-layout.mjs [주소=http://localhost:5199] [창 폭들=600,768,…]
// 하나라도 걸리면 종료 코드 1. 기준 폭의 정본은 styles.css `.case-rows` 다

import { chromium } from '@playwright/test';

const 주소 = process.argv[2] ?? 'http://localhost:5199';
const 폭들 = (process.argv[3] ?? '600,621,700,768,820,900,1000,1024,1100,1164,1165,1280,1440').split(',').map(Number);
const 서비스 = { id: 1, prefix: 'MKT', name: '데모마켓', color: '#9e4a27', envs: [], hasSlackWebhook: false, testsDir: 'mkt', permissions: { cases: 'write', runs: 'write', authoring: 'write' } };
const 사람 = { username: 'admin', displayName: '관리자', role: 'admin', dashboard: 'read', mustChangePassword: false, services: [서비스] };
const 스키마 = { type: 'object', properties: { loginId: { type: 'string', description: '아이디', default: 'demo01' }, keepLogin: { type: 'boolean', description: '로그인 유지', default: true } } };
const 케이스 = (tcId, platforms, techniques = []) => ({ tcId, name: '규칙에 맞는 아이디를 넣으면 안내 없이 다음 칸으로 넘어간다', platforms, precondition: [], paramSchema: 스키마, expectedSchema: { type: 'object', properties: {} }, filePath: `mkt/${tcId}.spec.ts`, isActive: true, scannedAt: '2026-10-05T00:00:00Z', unconfirmed: null, unconfirmedSince: null, savedInput: null, techniques });
const 결과 = (tcId, platform, status, recent) => ({ tcId, platform, status, historyId: 1, runId: 1, durationMs: 3200, finishedAt: '2026-10-05T00:00:00Z', recent });
const 실행 = { runId: 1, title: '회원가입 회귀', triggeredBy: 'admin', triggeredByName: '관리자', env: 'stage', baseUrl: 'https://stage.example.com', serviceName: '데모마켓', status: 'DONE', kind: 'FN', startedAt: '2026-10-05T00:00:00Z', finishedAt: '2026-10-05T00:01:00Z', counts: { total: 3, pass: 2, fail: 1, na: 0, running: 0 } };
const 응답 = (url) => {
  const p = new URL(url).pathname;
  if (p === '/api/auth/me') return { user: 사람 };
  if (p === '/api/catalog/cases') return { items: [케이스('MKT-FN-001', ['desktop', 'mobile']), 케이스('MKT-FN-002', ['desktop', 'mobile'], ['경계값 분석', '동등 분할']), 케이스('MKT-FN-003', ['desktop'])], total: 3, totalIsExact: true, sort: 'tc_id', page: 1, pageSize: 50, unconfirmed: { count: 0, oldestSince: null } };
  if (p === '/api/catalog/scan') return { scannedAt: '2026-10-05T00:00:00Z', added: 0, updated: 3, deactivated: 0, duplicates: [] };
  // 두 디바이스 다 판정이 섞여야 집계 글자가 가장 길다 — 겹침이 나던 꼴이다
  if (p === '/api/runs/last-by-case') return { items: [결과('MKT-FN-001', 'desktop', 'PASS', ['PASS', 'FAIL', 'NA', 'PASS']), 결과('MKT-FN-001', 'mobile', 'FAIL', ['FAIL', 'NA', 'PASS']), 결과('MKT-FN-002', 'desktop', 'NA', ['NA'])] };
  if (p === '/api/runs') return { items: [실행], total: 1, totalIsExact: true, page: 1, pageSize: 50, summary: { runs: 1, allPass: 0, hasFail: 1, durationOf: 1, avgDurationMs: 60000, maxDurationMs: 60000 } };
  return {};
};

// 페이지 안에서 잰다 — 같은 줄에서 겹치는 상자 · 줄 밖으로 나간 판정 · 자기 디바이스 칸을 넘은 집계 글자 · 표 모양 입력 칸 폭
function 재기() {
  const 상자 = (e) => e.getBoundingClientRect();
  const 겹치나 = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
  const 문제 = [];
  for (const [i, 줄] of [...document.querySelectorAll('.row.pickable')].entries()) {
    const 입력 = [...줄.querySelectorAll('.params input, .params select, .params label')].map(상자);
    const 오른쪽 = [...줄.querySelectorAll('.right > *')].map(상자);
    if (입력.some((a) => 오른쪽.some((b) => 겹치나(a, b)))) 문제.push(`${i + 1}째 줄 입력 칸이 판정 · 버튼과 겹친다`);
    if (오른쪽.some((b) => b.right > 상자(줄).right + 0.5)) 문제.push(`${i + 1}째 줄 판정 · 버튼이 줄 밖으로 나간다`);
    const 디바이스 = [...줄.querySelectorAll('.device')];
    for (const [j, d] of 디바이스.entries()) {
      const 칸 = 상자(d);
      for (const b of d.querySelectorAll('.sparktext b')) {
        const 글 = 상자(b);
        if (글.right > 칸.right + 0.5 || 글.left < 칸.left - 0.5) 문제.push(`${i + 1}째 줄 ${j + 1}째 디바이스 집계 「${b.textContent}」가 칸 밖이다`);
      }
    }
    const 쌓였나 = getComputedStyle(줄).gridTemplateRows.split(' ').length >= 4;
    if (!쌓였나) for (const e of 줄.querySelectorAll('.params input, .params select')) if (상자(e).width < 90) 문제.push(`${i + 1}째 줄 표 모양 입력 칸이 ${Math.round(상자(e).width)}px 이다(90 미만)`);
  }
  const 머리 = document.querySelector('.case-rows .rowhead');
  const 전체선택 = 머리?.querySelector('input[type=checkbox]');
  if (전체선택 === null || 전체선택 === undefined || 상자(전체선택).width === 0) 문제.push('「이 쪽 전체 선택」 체크박스가 안 보인다');
  if (document.documentElement.scrollWidth > document.documentElement.clientWidth) 문제.push('페이지가 가로로 넘친다');
  const 줄 = document.querySelector('.row.pickable');
  return { 문제, 쌓였나: 줄 !== null && getComputedStyle(줄).gridTemplateRows.split(' ').length >= 4, 줄높이: Math.round(줄?.getBoundingClientRect().height ?? 0), 목록폭: Math.round(document.querySelector('.case-rows')?.getBoundingClientRect().width ?? 0) };
}

const 브라우저 = await chromium.launch();
let 걸림 = 0;
for (const 언어 of ['ko', 'en']) {
  for (const 접음 of [false, true]) {
    for (const 폭 of 폭들) {
      const 쪽 = await 브라우저.newPage({ viewport: { width: 폭, height: 800 } });
      await 쪽.addInitScript(([l, f]) => { localStorage.setItem('화면언어', l); localStorage.setItem('사이드바접음', f ? '1' : '0'); }, [언어, 접음]);
      await 쪽.route('**/api/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(응답(r.request().url())) }));
      await 쪽.goto(`${주소}/#/cases/fn`);
      await 쪽.waitForSelector('.row.pickable', { timeout: 15000 });
      const 잼 = await 쪽.evaluate(재기);
      // 실행 기록 표머리는 창 620px 이상에서 늘 보인다 — 케이스 목록의 쌓기 규칙이 번지지 않았는지
      await 쪽.goto(`${주소}/#/runs/fn`);
      await 쪽.waitForSelector('.row', { timeout: 15000 });
      const 실행머리 = await 쪽.evaluate(() => { const h = document.querySelector('.rowhead.runhead'); return h !== null && getComputedStyle(h).display !== 'none'; });
      if (폭 > 620 && !실행머리) 잼.문제.push('실행 기록 표머리가 안 보인다');
      const 이름 = `${언어} · 사이드바 ${접음 ? '접음' : '폄'} · 창 ${폭}px · 목록 ${잼.목록폭}px · ${잼.쌓였나 ? '쌓임' : '표'} · 첫 줄 ${잼.줄높이}px`;
      console.log(잼.문제.length === 0 ? `통과  ${이름}` : `걸림  ${이름} — ${잼.문제.join(' / ')}`);
      if (잼.문제.length > 0) 걸림 += 1;
      await 쪽.close();
    }
  }
}
await 브라우저.close();
console.log(걸림 === 0 ? '모두 통과' : `걸린 경우 ${걸림}`);
process.exit(걸림 === 0 ? 0 : 1);
