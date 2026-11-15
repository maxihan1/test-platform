// 웹뷰 구간 검사 — 맥락 바꾸기 · 되돌리기 · 구간 안 네이티브 전용 부품 막기 · 네이티브로 갔다 오는 사진과 설정을 가짜 driver 로 본다 (도메인/러너 §5.2 「범용 앱 부품」)
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AppDriver } from './app.js';
import { 뜰때까지, 먼저뜨는것, 보이나, 움직이는화면에서, 토스트글 } from './appParts.js';
import { PNG } from './highlight.js';
import { stepScope } from './context.js';
import { 앱을지켜본다 } from './highlight.js';
import { 웹뷰사진, 웹뷰에서, 웹맥락인가 } from './webview.js';

const WEB = 'WEBVIEW_com.shop';

/** 맥락을 기억하는 가짜 폰 — 명령마다 그때 맥락을 적는다 */
function 가짜폰(맥락목록: () => string[] = () => ['NATIVE_APP', WEB]) {
  let 지금 = 'NATIVE_APP';
  const 기록 = [] as string[];
  const driver = {
    capabilities: { appPackage: 'com.shop' },
    getContexts: async () => 맥락목록(),
    switchContext: vi.fn(async (이름: string) => {
      기록.push(`맥락 ${이름}`);
      지금 = 이름;
    }),
    updateSettings: async (값: unknown) => void 기록.push(`설정 ${JSON.stringify(값)} @${지금}`),
    $: (선택자: string) => ({
      isExisting: async () => true,
      isDisplayed: async () => true,
      waitForDisplayed: async () => true,
      getElement: async () => {
        기록.push(`찾기 ${선택자} @${지금}`);
        return { elementId: 'wv' };
      },
    }),
    // 시간 안에 다섯 번 되풀이하다 못 되면 던진다
    waitUntil: async (조건: () => Promise<boolean>) => {
      for (let i = 0; i < 5; i++) if (await 조건()) return true;
      throw new Error('timeout');
    },
  };
  return { driver: driver as unknown as AppDriver & typeof driver, 기록, 지금: () => 지금 };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('웹뷰에서', () => {
  it('시험 대상 앱의 웹뷰 맥락으로 바꿔 할일을 돌리고 값을 돌려준 뒤 네이티브로 되돌린다 — Chrome 맞춤 탭이 먼저 있어도 앱 것이다', async () => {
    const 폰 = 가짜폰(() => ['NATIVE_APP', 'WEBVIEW_chrome', WEB]);
    const 값 = await 웹뷰에서(폰.driver, async () => {
      expect(폰.지금()).toBe(WEB);
      expect(웹맥락인가(폰.driver)).toBe(true);
      return '결제 화면';
    });
    expect(값).toBe('결제 화면');
    expect(폰.기록).toEqual([`맥락 ${WEB}`, '맥락 NATIVE_APP']);
    expect(웹맥락인가(폰.driver)).toBe(false);
  });

  it('할일이 던져도 되돌리고 원래 오류를 낸다 — 되돌리기 실패는 알리기만 한다', async () => {
    const 폰 = 가짜폰();
    await expect(웹뷰에서(폰.driver, async () => Promise.reject(new Error('주문 실패')))).rejects.toThrow('주문 실패');
    expect(폰.지금()).toBe('NATIVE_APP');

    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    폰.driver.switchContext.mockImplementation(async (이름: string) => {
      if (이름 === 'NATIVE_APP') throw new Error('연결 끊김');
    });
    await expect(웹뷰에서(폰.driver, async () => Promise.reject(new Error('주문 실패')))).rejects.toThrow('주문 실패');
    expect(error).toHaveBeenCalledWith('[kit] 웹뷰에서 네이티브로 되돌리지 못했다: 연결 끊김');
    // 폰은 아직 웹 맥락이라 표시를 남긴다 — 네이티브 부품이 웹 맥락에 엉뚱하게 가지 않게
    expect(웹맥락인가(폰.driver)).toBe(true);
    await expect(보이나(폰.driver, '~홈')).rejects.toThrow('웹 맥락에서는 못 쓴다');
  });

  it('첫 웹뷰는 앱 것이 없을 때만 고른다', async () => {
    const 폰 = 가짜폰(() => ['NATIVE_APP', 'WEBVIEW_chrome']);
    await 웹뷰에서(폰.driver, async () => expect(폰.지금()).toBe('WEBVIEW_chrome'));
  });

  it('웹뷰 맥락이 늦게 뜨면 기다리고, 시간 안에 안 뜨면 까닭을 실어 던진다', async () => {
    let 번 = 0;
    const 늦게 = 가짜폰(() => (++번 > 3 ? ['NATIVE_APP', WEB] : ['NATIVE_APP']));
    expect(await 웹뷰에서(늦게.driver, async () => 'ok')).toBe('ok');

    const 없음 = 가짜폰(() => ['NATIVE_APP']);
    await expect(웹뷰에서(없음.driver, async () => 'ok')).rejects.toThrow('웹뷰 맥락이 10초 안에 뜨지 않았다(지금 맥락: NATIVE_APP) — 웹 화면이 안 열렸거나 앱이 웹뷰 디버깅을 켠 빌드가 아니다');
    expect(없음.driver.switchContext).not.toHaveBeenCalled();
  });

  it('구간 안에서 또 부르면 던진다', async () => {
    const 폰 = 가짜폰();
    await expect(웹뷰에서(폰.driver, () => 웹뷰에서(폰.driver, async () => 'x'))).rejects.toThrow('웹뷰에서 구간 안에서 웹뷰에서 를 또 부를 수 없다');
    expect(폰.지금()).toBe('NATIVE_APP');
  });
});

describe('구간 안의 부품', () => {
  it('네이티브 전용 부품은 웹 맥락에서 던지고, 구간이 끝나면 다시 쓴다', async () => {
    const 폰 = 가짜폰();
    await 웹뷰에서(폰.driver, async () => {
      await expect(뜰때까지(폰.driver, '~주문')).rejects.toThrow('뜰때까지 은 웹 맥락에서는 못 쓴다');
      await expect(보이나(폰.driver, '~주문')).rejects.toThrow('보이나 은 웹 맥락에서는 못 쓴다');
      // 안의 보이나 가 던진 것을 될때까지 가 삼켜 「안 떴다」가 되지 않는다
      await expect(먼저뜨는것(폰.driver, { 홈: '~홈' })).rejects.toThrow('먼저뜨는것 은 웹 맥락에서는 못 쓴다');
      await expect(토스트글(폰.driver, 'id=toast')).rejects.toThrow('토스트글 은 웹 맥락에서는 못 쓴다');
    });
    expect(await 보이나(폰.driver, '~주문')).toBe(true);
  });

  it('움직이는화면에서 는 설정을 바꿀 때마다 네이티브로 갔다 웹 맥락으로 돌아온다', async () => {
    const 폰 = 가짜폰();
    await 웹뷰에서(폰.driver, () => 움직이는화면에서(폰.driver, async () => expect(폰.지금()).toBe(WEB)));
    expect(폰.기록).toEqual([
      `맥락 ${WEB}`,
      '맥락 NATIVE_APP',
      '설정 {"waitForIdleTimeout":1000} @NATIVE_APP',
      `맥락 ${WEB}`,
      '맥락 NATIVE_APP',
      '설정 {"waitForIdleTimeout":10000} @NATIVE_APP',
      `맥락 ${WEB}`,
      '맥락 NATIVE_APP',
    ]);
  });
});

describe('웹뷰사진', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'webview-shot-'));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  /** 108×240 흰 사진을 찍는 가짜 폰 — 웹뷰 상자는 (0,20) 넓이 108 · 웹뷰 안 CSS 넓이는 36 이라 3배다 */
  function 사진폰() {
    const 폰 = 가짜폰();
    const d = 폰.driver as unknown as Record<string, unknown>;
    d.execute = vi.fn(async () => {
      expect(폰.지금()).toBe(WEB);
      return [2, 4, 6, 8, 36];
    });
    d.saveScreenshot = vi.fn(async (path: string) => {
      폰.기록.push(`사진 @${폰.지금()}`);
      const png = { width: 108, height: 240, data: new Uint8Array(108 * 240 * 4).fill(255) };
      await writeFile(path, PNG.sync.write(png));
    });
    d.getElementRect = vi.fn(async () => ({ x: 0, y: 20, width: 108, height: 180 }));
    d.getWindowRect = vi.fn(async () => ({ x: 0, y: 0, width: 108, height: 240 }));
    return 폰;
  }

  it('폰 화면 전체를 네이티브로 찍고, 웹 요소 자리를 웹뷰 상자 안 폰 화소로 옮겨 표시한 뒤 웹 맥락으로 돌아온다', async () => {
    const 폰 = 사진폰();
    const path = join(dir, '1.png');
    await 웹뷰에서(폰.driver, () => 웹뷰사진(폰.driver, path, { 웹: WEB, id: 'web-el-1' }));
    expect(폰.기록).toEqual([
      `맥락 ${WEB}`,
      '맥락 NATIVE_APP',
      '찾기 android=new UiSelector().className("android.webkit.WebView") @NATIVE_APP',
      '사진 @NATIVE_APP',
      `맥락 ${WEB}`,
      '맥락 NATIVE_APP',
    ]);
    const png = PNG.sync.read(await readFile(path));
    const 화소 = (x: number, y: number) => [...png.data.slice((y * png.width + x) * 4, (y * png.width + x) * 4 + 3)];
    // CSS (2,4) 넓이 6 높이 8 → 폰 (6, 32) 넓이 18 높이 24 — 안쪽은 빨강이 섞이고 먼 곳은 그대로 희다
    expect(화소(15, 44)[1]).toBeLessThan(255);
    expect(화소(100, 200)).toEqual([255, 255, 255]);
  });

  it('웹 요소 자리를 못 읽으면 표시 없이 사진만 남긴다', async () => {
    const 폰 = 사진폰();
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    (폰.driver as unknown as { execute: ReturnType<typeof vi.fn> }).execute.mockRejectedValue(new Error('stale element'));
    const path = join(dir, '2.png');
    await 웹뷰에서(폰.driver, () => 웹뷰사진(폰.driver, path, { 웹: WEB, id: 'web-el-1' }));
    expect(error).toHaveBeenCalledWith('[kit] 웹 요소 자리를 읽지 못했다: stale element');
    const png = PNG.sync.read(await readFile(path));
    expect([...png.data.slice(0, 3)]).toEqual([255, 255, 255]);
    expect(폰.기록).toContain('사진 @NATIVE_APP');
  });

  it('step 이 구간을 감싸 사진이 구간 밖에서 찍혀도 그 웹 맥락에 잠깐 들어가 자리를 읽는다', async () => {
    const 폰 = 사진폰();
    await 웹뷰에서(폰.driver, async () => undefined);
    폰.기록.length = 0;
    await 웹뷰사진(폰.driver, join(dir, '3.png'), { 웹: WEB, id: 'web-el-1' });
    expect(폰.기록).toEqual([`맥락 ${WEB}`, '맥락 NATIVE_APP', '찾기 android=new UiSelector().className("android.webkit.WebView") @NATIVE_APP', '사진 @NATIVE_APP']);
  });

  it('구간 안에서 다룬 요소는 웹 맥락과 함께 적히고, 웹뷰 상자 찾기는 다룬 요소로 남지 않는다', async () => {
    const 폰 = 사진폰();
    const 듣기 = new Map<string, (e: unknown) => void>();
    Object.assign(폰.driver, { on: (이름: string, fn: (e: unknown) => void) => 듣기.set(이름, fn) });
    앱을지켜본다(폰.driver);
    const scope = { assertions: [] } as Parameters<typeof stepScope.run>[0];
    await stepScope.run(scope, () =>
      웹뷰에서(폰.driver, async () => {
        듣기.get('command')!({ command: 'elementClick', endpoint: '/session/s/element/web-el-7/click' });
        expect(scope.마지막요소).toEqual({ 웹: WEB, id: 'web-el-7' });
        await 웹뷰사진(폰.driver, join(dir, '4.png'), { 웹: WEB, id: 'web-el-7' });
        expect(scope.마지막요소).toEqual({ 웹: WEB, id: 'web-el-7' });
      }),
    );
  });
});
