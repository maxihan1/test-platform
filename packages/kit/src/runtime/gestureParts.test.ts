// 손동작 부품 검사 — 가짜 driver 로 보내는 mobile: 손짓 · 끝점 · 웹 맥락 막기를 본다 (도메인/러너 §5.2 「범용 앱 부품」 APP-F3-06)
import { describe, expect, it } from 'vitest';

import type { AppDriver } from './app.js';
import { 끌어놓기, 벌리기, 오므리기, 요소안에서밀기, type 미는방향 } from './gestureParts.js';
import { 웹뷰에서 } from './webview.js';

/** 선택자마다 요소 번호 · 자리를 정해 주는 가짜 폰. 보낸 mobile: 명령을 모은다 */
function 가짜폰(화면: Record<string, { id: string; 자리?: { x: number; y: number; width: number; height: number } }>) {
  const 보낸 = [] as [string, unknown][];
  const 기다린 = [] as string[];
  const driver = {
    $: (선택자: string) => ({
      getElement: async () => {
        const 요소 = 화면[선택자];
        if (요소 === undefined) throw new Error(`no such element: ${선택자}`);
        return { elementId: 요소.id, waitForDisplayed: async () => void 기다린.push(선택자) };
      },
    }),
    getElementRect: async (id: string) => Object.values(화면).find((요소) => 요소.id === id)?.자리,
    execute: async (명령: string, 인자: unknown) => void 보낸.push([명령, 인자]),
    getContexts: async () => ['NATIVE_APP', 'WEBVIEW_com.shop'],
    switchContext: async () => undefined,
    waitUntil: async (조건: () => Promise<boolean>) => {
      if (!(await 조건())) throw new Error('timeout');
    },
    capabilities: { appPackage: 'com.shop' },
  } as unknown as AppDriver;
  return { driver, 보낸, 기다린 };
}

describe('요소안에서밀기', () => {
  it('보일 때까지 기다린 요소 안에서 그 방향으로 민다 — 정도는 appium-cli swipe-in 과 같다', async () => {
    const 폰 = 가짜폰({ '~상품 줄': { id: 'el-1' } });
    await 요소안에서밀기(폰.driver, '~상품 줄', '왼쪽');
    await 요소안에서밀기(폰.driver, '~상품 줄', '아래');
    expect(폰.기다린).toEqual(['~상품 줄', '~상품 줄']);
    expect(폰.보낸).toEqual([
      ['mobile: swipeGesture', { elementId: 'el-1', direction: 'left', percent: 0.75 }],
      ['mobile: swipeGesture', { elementId: 'el-1', direction: 'down', percent: 0.75 }],
    ]);
  });

  it('모르는 방향은 폰에 보내기 전에 던진다', async () => {
    const 폰 = 가짜폰({ '~상품 줄': { id: 'el-1' } });
    await expect(요소안에서밀기(폰.driver, '~상품 줄', 'left' as 미는방향)).rejects.toThrow('방향은 위 · 아래 · 왼쪽 · 오른쪽이다: left');
    expect(폰.보낸).toEqual([]);
  });
});

describe('끌어놓기', () => {
  it('집을 요소를 놓을 요소의 가운데로 끈다 — 끝점은 놓을 요소의 지금 자리에서 구한다', async () => {
    const 폰 = 가짜폰({ '~사진 1': { id: 'el-1' }, '~앨범': { id: 'el-2', 자리: { x: 100, y: 200, width: 50, height: 61 } } });
    await 끌어놓기(폰.driver, '~사진 1', '~앨범');
    expect(폰.기다린).toEqual(['~사진 1', '~앨범']);
    expect(폰.보낸).toEqual([['mobile: dragGesture', { elementId: 'el-1', endX: 125, endY: 231 }]]);
  });

  it('놓을 요소가 없으면 끌지 않고 던진다', async () => {
    const 폰 = 가짜폰({ '~사진 1': { id: 'el-1' } });
    await expect(끌어놓기(폰.driver, '~사진 1', '~앨범')).rejects.toThrow('no such element: ~앨범');
    expect(폰.보낸).toEqual([]);
  });
});

describe('벌리기 · 오므리기', () => {
  it('그 요소에서 두 손가락을 벌리고 오므린다', async () => {
    const 폰 = 가짜폰({ '~지도': { id: 'el-3' } });
    await 벌리기(폰.driver, '~지도');
    await 오므리기(폰.driver, '~지도');
    expect(폰.보낸).toEqual([
      ['mobile: pinchOpenGesture', { elementId: 'el-3', percent: 0.75 }],
      ['mobile: pinchCloseGesture', { elementId: 'el-3', percent: 0.75 }],
    ]);
  });
});

describe('웹 맥락', () => {
  it('손동작 부품은 웹뷰 구간 안에서 던진다 — 네이티브 손짓이라 웹 요소 번호를 못 쓴다', async () => {
    const 폰 = 가짜폰({ '~지도': { id: 'el-3' } });
    await 웹뷰에서(폰.driver, async () => {
      await expect(요소안에서밀기(폰.driver, '~지도', '위')).rejects.toThrow('요소안에서밀기 은 웹 맥락에서는 못 쓴다');
      await expect(끌어놓기(폰.driver, '~지도', '~지도')).rejects.toThrow('끌어놓기 은 웹 맥락에서는 못 쓴다');
      await expect(벌리기(폰.driver, '~지도')).rejects.toThrow('벌리기 은 웹 맥락에서는 못 쓴다');
      await expect(오므리기(폰.driver, '~지도')).rejects.toThrow('오므리기 은 웹 맥락에서는 못 쓴다');
    });
    expect(폰.보낸).toEqual([]);
  });
});
