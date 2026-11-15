// 입력 부품 검사 — 가짜 driver 로 보내는 mobile: 키 · 치기 · 클립보드와 웹 맥락 막기를 본다 (도메인/러너 §5.2 「범용 앱 부품」 APP-F3-07)
import { describe, expect, it } from 'vitest';

import type { AppDriver } from './app.js';
import type { 앱요소 } from './appParts.js';
import { 칸비우기, 클립보드쓰기, 클립보드읽기, 키누르기, 포커스칸에치기, type 폰키 } from './inputParts.js';
import { 웹뷰에서 } from './webview.js';

/** 보낸 mobile: 명령을 모으고, 명령마다 정한 답을 돌려주는 가짜 폰 */
function 가짜폰(답: Record<string, unknown> = {}) {
  const 보낸 = [] as [string, unknown][];
  const 맥락 = [] as string[];
  const driver = {
    execute: async (명령: string, 인자: unknown) => {
      보낸.push([명령, 인자]);
      return 답[명령];
    },
    getContexts: async () => ['NATIVE_APP', 'WEBVIEW_com.shop'],
    switchContext: async (이름: string) => void 맥락.push(이름),
    waitUntil: async (조건: () => Promise<boolean>) => {
      if (!(await 조건())) throw new Error('timeout');
    },
    capabilities: { appPackage: 'com.shop' },
  } as unknown as AppDriver;
  return { driver, 보낸, 맥락 };
}

describe('키누르기', () => {
  it('키 이름을 appium-cli press 와 같은 keycode 로 보낸다', async () => {
    const 폰 = 가짜폰();
    for (const 키 of ['홈', '최근 앱', '지우기', '탭', '붙여 넣기'] as 폰키[]) await 키누르기(폰.driver, 키);
    expect(폰.보낸).toEqual([
      ['mobile: pressKey', { keycode: 3 }],
      ['mobile: pressKey', { keycode: 187 }],
      ['mobile: pressKey', { keycode: 67 }],
      ['mobile: pressKey', { keycode: 61 }],
      ['mobile: pressKey', { keycode: 279 }],
    ]);
  });

  it('모르는 키는 폰에 보내기 전에 던진다', async () => {
    const 폰 = 가짜폰();
    await expect(키누르기(폰.driver, '엔터' as 폰키)).rejects.toThrow('키는 홈 · 최근 앱 · 지우기 · 탭 · 붙여 넣기 이다: 엔터');
    await expect(키누르기(폰.driver, 'constructor' as 폰키)).rejects.toThrow('이다: constructor');
    expect(폰.보낸).toEqual([]);
  });
});

describe('포커스칸에치기', () => {
  it('포커스 칸에 mobile: type 으로 글을 친다', async () => {
    const 폰 = 가짜폰({ 'mobile: type': true });
    await 포커스칸에치기(폰.driver, '123456');
    expect(폰.보낸).toEqual([['mobile: type', { text: '123456' }]]);
  });

  it('폰이 글을 안 받거나 칠 글이 비면 던진다 — 빈 칸으로 다음 단계가 돌지 않게', async () => {
    await expect(포커스칸에치기(가짜폰({ 'mobile: type': false }).driver, '123456')).rejects.toThrow('폰이 글을 받지 않았다');
    const 폰 = 가짜폰();
    await expect(포커스칸에치기(폰.driver, '')).rejects.toThrow('칠 글이 비었다');
    expect(폰.보낸).toEqual([]);
  });
});

describe('칸비우기', () => {
  it('그 칸의 clearValue 를 부른다', async () => {
    let 비움 = 0;
    await 칸비우기({ clearValue: async () => void 비움++ } as unknown as 앱요소);
    expect(비움).toBe(1);
  });
});

describe('클립보드', () => {
  it('읽기는 base64 답을 글로 풀고, 쓰기는 글을 base64 plaintext 로 보낸다', async () => {
    const 폰 = 가짜폰({ 'mobile: getClipboard': Buffer.from('쿠폰 A1', 'utf8').toString('base64') });
    expect(await 클립보드읽기(폰.driver)).toBe('쿠폰 A1');
    await 클립보드쓰기(폰.driver, '쿠폰 A1');
    expect(폰.보낸).toEqual([
      ['mobile: getClipboard', {}],
      ['mobile: setClipboard', { content: Buffer.from('쿠폰 A1', 'utf8').toString('base64'), contentType: 'plaintext' }],
    ]);
  });

  it('빈 클립보드는 빈 글이다', async () => {
    expect(await 클립보드읽기(가짜폰({ 'mobile: getClipboard': '' }).driver)).toBe('');
    expect(await 클립보드읽기(가짜폰().driver)).toBe('');
  });
});

describe('웹뷰 구간 안', () => {
  it('키누르기 · 포커스칸에치기는 던지고, 클립보드는 맥락을 바꾸지 않고 그대로 쓴다', async () => {
    const 폰 = 가짜폰({ 'mobile: getClipboard': Buffer.from('A1').toString('base64') });
    await 웹뷰에서(폰.driver, async () => {
      await expect(키누르기(폰.driver, '홈')).rejects.toThrow('키누르기 은 웹 맥락에서는 못 쓴다');
      await expect(포커스칸에치기(폰.driver, '1234')).rejects.toThrow('포커스칸에치기 은 웹 맥락에서는 못 쓴다');
      const 앞 = 폰.맥락.length;
      expect(await 클립보드읽기(폰.driver)).toBe('A1');
      expect(폰.맥락.length).toBe(앞);
    });
    expect(폰.보낸.map(([명령]) => 명령)).toEqual(['mobile: getClipboard']);
  });
});
