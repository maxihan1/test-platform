// 크롤러 「움직임」 줄 — 순수 함수와 실제 브라우저로 늦게 채워짐 · 굴림 · 덮개 · 안쪽 링크 · 같은 이름 · 확인 창을 본다
import { type Browser, chromium } from '@playwright/test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 창남기기, 굴려보기, 움직임줄, 이름요소, 재료읽기, type 재료, 줄변화보기 } from './authoring-crawl-motion.js';
import { 보기 } from './authoring-crawl-page.js';
import { 새쪽 } from './authoring-crawl-session.js';

const 빈재료: 재료 = { 높이배: 1, 영역: [], 덮개: [], 안쪽: [], 이름들: [] };

describe('움직임줄', () => {
  it('막 떴을 때 없던 이름 붙은 요소를 늦게 채워짐으로 적는다', () => {
    const 이른 = '- heading "알림"\n- button "새로고침"';
    const 늦은 = '- heading "알림"\n- button "새로고침"\n- list:\n  - listitem:\n    - link "첫 글"\n- link "둘째 글"';
    expect(움직임줄(이른, 늦은, 빈재료, null)).toEqual(['# 늦게 채워짐: 막 떴을 때 2개 → 다 온 뒤 4개 · link 「첫 글」 link 「둘째 글」']);
    expect(움직임줄(늦은, 늦은, 빈재료, null)).toEqual([]);
  });

  it('굴림 · 덮개 · 안쪽 링크 · 같은 이름을 줄로 바꾼다', () => {
    const 재: 재료 = {
      높이배: 3.2,
      영역: [{ 이름: '댓글', 줄: 20 }],
      덮개: [{ 이름: '쿠키를 씁니다', 넓이: 18, 버튼: ['수락', '닫기'], 창: false }],
      안쪽: [{ 겉: '오늘 날씨 좋네요', 안: ['#날씨', '@철수'] }],
      이름들: [
        { 종류: '버튼', 이름: '등록' },
        { 종류: '버튼', 이름: '등록' },
        { 종류: '링크', 이름: '홈' },
      ],
    };
    const 굴린 = { 쪽: { 앞수: 20, 뒤수: 40, 첫줄바뀜: false }, 영역: [{ 앞수: 20, 뒤수: 20, 첫줄바뀜: true }] };
    expect(움직임줄('', '', 재, 굴린)).toEqual([
      '# 굴림: 쪽 — 화면 높이의 3.2배 · 굴리면 줄이 붙는다(20→40)',
      '# 굴림: 영역 「댓글」 — 줄 20개 · 줄 수는 그대로인데 첫 줄이 바뀐다(가상 목록)',
      '# 덮개: 「쿠키를 씁니다」 · 화면의 18% · 버튼 「수락」 「닫기」',
      '# 안쪽 링크: 「오늘 날씨 좋네요」 안에 「#날씨」 「@철수」',
      '# 같은 이름: 버튼 「등록」 2개',
    ]);
  });

  it('막 떴을 때를 못 찍었으면 늦게 채워짐을 적지 않는다', () => {
    expect(움직임줄('', '- link "첫 글"', 빈재료, null)).toEqual([]);
  });

  it('이름요소는 이름 붙은 줄만 · 이름 안 따옴표에서 끊지 않는다 · 줄변화보기는 비교할 줄이 없으면 null', () => {
    expect(이름요소('- list:\n  - listitem: 글\n  - link "더보기" [cursor=pointer]')).toEqual(['link 「더보기」']);
    expect(이름요소('- button "say \\"hi\\""')).toEqual(['button 「say "hi"」']);
    expect(줄변화보기([0, ''], [10, 'a'])).toBeNull();
    expect(줄변화보기([10, 'a'], [10, 'a'])).toEqual({ 앞수: 10, 뒤수: 10, 첫줄바뀜: false });
  });
});

describe('실제 브라우저', () => {
  let 브라우저: Browser;
  beforeAll(async () => {
    브라우저 = await chromium.launch();
  });
  afterAll(async () => {
    await 브라우저.close();
  });

  const 화면 = `<!doctype html><html><body style="margin:0">
<nav><ul><li>홈</li><li>메뉴</li></ul></nav>
<h1>목록</h1>
<button id="지우기" onclick="confirm('정말 지울까요?')">지우기</button>
<div id="쿠키" style="position:fixed;bottom:0;left:0;right:0;height:120px;background:#eee">쿠키를 씁니다 <button>수락</button><button>닫기</button></div>
<article style="cursor:pointer" onclick="void 0">오늘 날씨 <a href="/tags/날씨">#날씨</a></article>
<button>등록</button><button>등록</button>
<ul id="목록">${Array.from({ length: 30 }, (_, i) => `<li style="height:60px">줄 ${i}</li>`).join('')}</ul>
<script>
fetch('/api/늦은').then((r) => r.text()).then(() => { const a = document.createElement('a'); a.href = '/늦은'; a.textContent = '늦게 온 링크'; document.body.append(a); });
addEventListener('scroll', () => { if (scrollY + innerHeight >= document.body.scrollHeight - 5 && !window.붙음) { window.붙음 = true; for (let i = 30; i < 40; i++) { const li = document.createElement('li'); li.textContent = '줄 ' + i; document.getElementById('목록').append(li); } } });
</script></body></html>`;

  it('보기가 늦게 채워짐 · 굴림(줄이 붙는다) · 덮개 · 안쪽 링크 · 같은 이름을 머리 줄로 남긴다', async () => {
    const { 맥락, 쪽 } = await 새쪽(브라우저, undefined);
    try {
      await 맥락.route('https://m.test/**', async (r) => {
        if (r.request().url().includes('/api/')) await new Promise((끝) => setTimeout(끝, 400));
        await r.fulfill({ contentType: 'text/html; charset=utf-8', body: 화면 });
      });
      const 본 = await 보기(쪽, 'https://m.test/');
      if (typeof 본 === 'string') throw new Error(`못 봄: ${본}`);
      const 줄 = 본.움직임 ?? [];
      expect(줄.find((x) => x.startsWith('# 늦게 채워짐:'))).toContain('link 「늦게 온 링크」');
      expect(줄.find((x) => x.startsWith('# 굴림: 쪽'))).toContain('굴리면 줄이 붙는다(31→41)');
      expect(줄.find((x) => x.startsWith('# 덮개:'))).toMatch(/^# 덮개: 「쿠키를 씁니다.*」 · 화면의 \d+% · 버튼 「수락」 「닫기」$/);
      expect(줄.find((x) => x.startsWith('# 안쪽 링크:'))).toContain('「#날씨」');
      expect(줄.find((x) => x.startsWith('# 같은 이름:'))).toContain('버튼 「등록」 2개');
      expect(await 쪽.evaluate(() => scrollY)).toBe(0);
    } finally {
      await 맥락.close();
    }
  });

  it('누른 뒤 뜬 브라우저 확인 창을 누른 것과 같이 그 화면에 남긴다', async () => {
    const { 맥락, 쪽 } = await 새쪽(브라우저, undefined);
    try {
      await 맥락.route('https://m.test/**', async (r) => {
        if (r.request().url().includes('/api/')) await new Promise((끝) => setTimeout(끝, 400));
        await r.fulfill({ contentType: 'text/html; charset=utf-8', body: 화면 });
      });
      await 쪽.goto('https://m.test/');
      await 쪽.click('#지우기');
      const 화면기록: { 움직임?: string[] } = {};
      창남기기(쪽, 화면기록, '버튼 「지우기」');
      창남기기(쪽, 화면기록, '버튼 「지우기」');
      expect(화면기록.움직임).toEqual(['# 확인 창: confirm 「정말 지울까요?」 ← 버튼 「지우기」']);
    } finally {
      await 맥락.close();
    }
  });

  it('굴릴 것이 없는 화면은 굴려 보지 않는다', async () => {
    const { 맥락, 쪽 } = await 새쪽(브라우저, undefined);
    try {
      await 맥락.route('https://m.test/**', (r) => r.fulfill({ contentType: 'text/html; charset=utf-8', body: '<h1>짧은 화면</h1>' }));
      await 쪽.goto('https://m.test/');
      const 재 = await 재료읽기(쪽);
      expect(await 굴려보기(쪽, 재)).toBeNull();
    } finally {
      await 맥락.close();
    }
  });
});
