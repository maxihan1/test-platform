// 화면 크기 판정 — 화면 하나의 PC · 모바일 차이(고정 HTML 넷: 같음 · 차이 있음 · 다른 주소 · 넘침) · 서비스 판정 셋 · PC 기록 그대로 (도메인/작성 §3.6 「화면 크기」 · PRD-F10-07)
import { type Browser, chromium } from '@playwright/test';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { 모바일견주기, 읽기 } from './authoring-crawl-page.js';
import { 지문, 틀키 } from './authoring-crawl-rules.js';
import { 새쪽 } from './authoring-crawl-session.js';
import { type 화면본, type 화면차이, 서비스가르기, 차이모양, 판정줄, 화면견주기 } from './authoring-crawl-viewport.js';

const 본 = (x: Partial<화면본> = {}): 화면본 => ({ 최종: 'https://s.test/goods/1', 넘침: false, 선언: true, 지문: 'aaa', 조작: ['홈', '장바구니'], ...x });
const 같음: 화면차이 = { 넘침: false, 선언: true, 구조같음: true, PC만: [], 모바일만: [] };

describe('화면견주기', () => {
  it('번호만 다른 주소는 같은 주소다 — 한쪽에만 있는 이름은 차례대로 · 겹치지 않게', () => {
    expect(화면견주기(본(), 본({ 최종: 'https://s.test/goods/2' }), 틀키)).toEqual(같음);
    expect(화면견주기(본({ 조작: ['홈', '고객센터', '고객센터'] }), 본({ 지문: 'bbb', 조작: ['홈', '메뉴 열기'] }), 틀키)).toEqual({
      ...같음, 구조같음: false, PC만: ['고객센터'], 모바일만: ['메뉴 열기'],
    });
  });

  it('물음표 뒤 값(세션 · 난수)만 다르면 같은 주소다 — 한 화면 때문에 서비스가 적응형이 되지 않게 · 해시 라우트는 남긴다', () => {
    expect(화면견주기(본({ 최종: 'https://s.test/search?sid=a1b2' }), 본({ 최종: 'https://s.test/search?sid=c3d4' }), 틀키).모바일주소).toBeUndefined();
    expect(화면견주기(본({ 최종: 'https://s.test/#/goods/1?t=1' }), 본({ 최종: 'https://s.test/#/m/goods/1' }), 틀키).모바일주소).toBe('https://s.test/#/m/goods/1');
  });

  it('다른 틀이면 모바일 주소를 물음표 뒤를 빼고 남기고, 다른 출처면 이름은 안 견준다', () => {
    expect(화면견주기(본(), 본({ 최종: 'https://s.test/m/goods/1?token=t0k' }), 틀키).모바일주소).toBe('https://s.test/m/goods/1');
    expect(화면견주기(본(), 본({ 최종: 'https://m.s.test/goods/1', 지문: 'aaa', 조작: [] }), 틀키)).toEqual({ ...같음, 모바일주소: 'https://m.s.test/goods/1', 구조같음: false });
  });
});

describe('서비스가르기', () => {
  it('다른 주소가 하나라도 있으면 적응형, 모든 화면이 넘치거나 선언이 없으면 PC 전용, 그 밖은 반응형, 견준 화면이 없으면 null', () => {
    expect(서비스가르기([같음, { ...같음, 넘침: true, 모바일주소: 'https://s.test/m' }])).toBe('adaptive');
    expect(서비스가르기([{ ...같음, 넘침: true }, { ...같음, 선언: false }])).toBe('desktop-only');
    expect(서비스가르기([{ ...같음, 넘침: true }, { ...같음, PC만: ['고객센터'] }])).toBe('responsive');
    expect(서비스가르기([])).toBeNull();
  });

  it('요약 줄에 판정과 셈이 실린다', () => {
    expect(판정줄([같음, { ...같음, 넘침: true, PC만: ['고객센터'] }], 1)).toBe(
      '화면 크기 판정 반응형(모바일로 연 화면 2장 · 다른 주소 0 · 넘침 1 · viewport 선언 없음 0 · 한쪽에만 있는 버튼 · 링크가 있는 화면 1 · 못 연 화면 1장)',
    );
    expect(판정줄([], 0)).toBe('화면 크기 판정 없음(모바일로 연 화면 0장)');
  });
});

describe('차이모양', () => {
  it('맞는 모양만 받고 이름은 60자로 자른다', () => {
    expect(차이모양({ ...같음, 모바일만: ['가'.repeat(80)] })).toEqual({ ...같음, 모바일만: ['가'.repeat(60)] });
    expect(차이모양({ ...같음, 넘침: 'yes' })).toBeNull();
    expect(차이모양({ ...같음, 모바일주소: 'javascript:alert(1)' })).toBeNull();
    expect(차이모양({ ...같음, PC만: Array.from({ length: 31 }, (_, i) => `x${i}`) })?.PC만).toHaveLength(30);
    expect(차이모양(null)).toBeNull();
  });
});

const 머리 = '<meta name="viewport" content="width=device-width, initial-scale=1">';
const 쪽들: Record<string, string> = {
  '/same': `${머리}<a href="/">홈</a><button>담기</button>`,
  '/menu': `${머리}<style>@media (max-width: 600px) { .pc { display: none } } @media (min-width: 601px) { .mo { display: none } }</style>
    <a href="/">홈</a><a class="pc" href="/cs">고객센터</a><button class="mo">메뉴 열기</button>`,
  '/wide': '<div style="width: 1200px"><a href="/">홈</a></div>',
  // 적응형 — 모바일 UA 를 /m/ 화면으로 보낸다(라우트가 준 3xx 의 다음 주소는 라우트를 안 거쳐 스크립트로 보낸다)
  '/goods': `${머리}<script>if (/iPhone/.test(navigator.userAgent)) location.replace('/m/goods')</script><a href="/">홈</a>`,
  '/m/goods': `${머리}<a href="/">홈</a>`,
  // 모바일 쪽 세션만 풀렸다 — 로그인 화면으로 돌려보낸다
  '/mypage': `${머리}<script>if (/iPhone/.test(navigator.userAgent)) location.replace('/login')</script><a href="/">홈</a>`,
  '/login': `${머리}<form><input name="id"><input type="password" name="pw"><button>로그인</button></form>`,
};

describe('모바일견주기 — 고정 HTML', () => {
  let 브라우저: Browser;
  beforeAll(async () => {
    브라우저 = await chromium.launch();
  });
  afterAll(async () => {
    await 브라우저.close();
  });

  const 열어견주기 = async (경로: string) => {
    const pc = await 새쪽(브라우저, undefined);
    const 모 = await 새쪽(브라우저, undefined, true);
    for (const 맥락 of [pc.맥락, 모.맥락]) {
      await 맥락.route('https://v.test/**', (r) =>
        r.fulfill({ contentType: 'text/html; charset=utf-8', body: `<html><head><title>t</title>${쪽들[new URL(r.request().url()).pathname] ?? 쪽들['/same']!}</head></html>` }),
      );
    }
    try {
      await pc.쪽.goto(`https://v.test${경로}`);
      const 전 = await 읽기(pc.쪽, 200, 'https://v.test');
      if (전 === '건너뜀') throw new Error('PC 쪽을 못 읽었다');
      const 차이 = await 모바일견주기(모.쪽, `https://v.test${경로}`, 전);
      const 뒤 = await 읽기(pc.쪽, 200, 'https://v.test');
      return { 차이, 전, 뒤 };
    } finally {
      await pc.맥락.close();
      await 모.맥락.close();
    }
  };

  it('같음 — 반응형 화면은 차이가 없고, PC 쪽 기록 · 지문은 모바일로 연 뒤에도 그대로다', async () => {
    const { 차이, 전, 뒤 } = await 열어견주기('/same');
    expect(차이).toEqual(같음);
    expect(뒤).toEqual(전);
    expect(지문(전.구조)).toBe(지문((뒤 as typeof 전).구조));
  });

  it('차이 있음 — 좁은 화면에서 숨는 메뉴와 나타나는 버튼을 한쪽에만 있는 이름으로 남긴다', async () => {
    expect((await 열어견주기('/menu')).차이).toEqual({ ...같음, 구조같음: false, PC만: ['고객센터'], 모바일만: ['메뉴 열기'] });
  });

  it('다른 주소 — 모바일 UA 를 다른 주소로 보내면 그 주소를 남긴다', async () => {
    expect((await 열어견주기('/goods')).차이).toMatchObject({ 모바일주소: 'https://v.test/m/goods' });
  });

  it('모바일로 다시 연 화면이 로그인 화면으로 돌려보내졌으면 다른 주소가 아니라 못 연 것이다(null)', async () => {
    expect((await 열어견주기('/mypage')).차이).toBeNull();
  });

  it('넘침 — viewport 선언이 없고 폭이 고정된 화면은 넘침 · 선언 없음이다', async () => {
    expect((await 열어견주기('/wide')).차이).toMatchObject({ 넘침: true, 선언: false });
  });
});
