// 앱 생명 주기 부품 검사 — 가짜 driver 로 보내는 mobile: 명령 · 앱 파일 고르기 · 되돌리기와 웹 맥락 막기를 본다 (도메인/러너 §5.2 「범용 앱 부품」 APP-F3-08)
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppDriver } from './app.js';
import { 딥링크열기, 뒤로보냈다오기, 앱다시깔기, 앱비우기, 옛판에서올리기, 인자로켜기, 화면껐다켜기 } from './lifecycleParts.js';
import { 웹뷰에서 } from './webview.js';

/** 보낸 명령을 차례대로 모으는 가짜 폰. 실패할 명령 · 깔 파일을 정할 수 있다 */
function 가짜폰(caps: Record<string, unknown> = { appPackage: 'com.shop', appActivity: '.Main' }, 실패할?: (명령: string, 인자: unknown) => boolean) {
  const 보낸 = [] as [string, unknown][];
  const 기록 = (명령: string, 인자: unknown): void => {
    보낸.push([명령, 인자]);
    if (실패할?.(명령, 인자) === true) throw new Error('팜이 막았다');
  };
  const driver = {
    execute: async (명령: string, 인자: unknown) => 기록(명령, 인자),
    terminateApp: async (꾸러미: string) => 기록('terminateApp', 꾸러미),
    activateApp: async (꾸러미: string) => 기록('activateApp', 꾸러미),
    getContexts: async () => ['NATIVE_APP', 'WEBVIEW_com.shop'],
    switchContext: async () => undefined,
    waitUntil: async (조건: () => Promise<boolean>) => {
      if (!(await 조건())) throw new Error('timeout');
    },
    capabilities: caps,
  } as unknown as AppDriver;
  return { driver, 보낸 };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('뒤로보냈다오기 · 딥링크열기 · 화면껐다켜기', () => {
  it('appium-cli background · deeplink · screen-off-on 과 같은 명령을 보낸다 — 딥 링크에는 시험 대상 앱 꾸러미를 싣는다', async () => {
    const 폰 = 가짜폰();
    await 뒤로보냈다오기(폰.driver, 5);
    await 딥링크열기(폰.driver, 'shop://item/7');
    await 화면껐다켜기(폰.driver);
    expect(폰.보낸).toEqual([
      ['mobile: backgroundApp', { seconds: 5 }],
      ['mobile: deepLink', { url: 'shop://item/7', package: 'com.shop' }],
      ['mobile: lock', {}],
      ['mobile: unlock', {}],
    ]);
  });

  it('1~600 이 아닌 초 · 주소 꼴이 아닌 딥 링크 · 꾸러미 없는 연결은 폰에 보내기 전에 던진다', async () => {
    const 폰 = 가짜폰();
    for (const 초 of [0, 1.5, 601]) await expect(뒤로보냈다오기(폰.driver, 초)).rejects.toThrow('초는 1~600 의 정수다');
    await expect(딥링크열기(폰.driver, 'item/7')).rejects.toThrow('주소는 myapp://… · https://… 꼴이다');
    await expect(딥링크열기(가짜폰({}).driver, 'shop://a')).rejects.toThrow('연결 설정에 시험 대상 앱 꾸러미(appPackage)가 없다');
    expect(폰.보낸).toEqual([]);
  });
});

describe('인자로켜기 · 앱비우기', () => {
  it('인자로켜기 는 끈 뒤 첫 화면에 글 인자를 실어 켠다 — appium-cli app restart 의 startActivity 와 같은 꼴', async () => {
    const 폰 = 가짜폰({ 'appium:appPackage': 'com.shop', 'appium:appActivity': '.Main' });
    await 인자로켜기(폰.driver, { server: 'http://host:3002', 'user-id': '7' });
    expect(폰.보낸).toEqual([
      ['terminateApp', 'com.shop'],
      ['mobile: startActivity', { component: 'com.shop/.Main', extras: [['s', 'server', 'http://host:3002'], ['s', 'user-id', '7']] }],
    ]);
  });

  it('앱비우기 는 데이터를 지운 뒤 켠다 — 인자를 주면 그 인자를 실어 켠다', async () => {
    const 폰 = 가짜폰();
    await 앱비우기(폰.driver);
    await 앱비우기(폰.driver, { server: 'http://host:3002' });
    expect(폰.보낸).toEqual([
      ['mobile: clearApp', { appId: 'com.shop' }],
      ['activateApp', 'com.shop'],
      ['mobile: clearApp', { appId: 'com.shop' }],
      ['mobile: startActivity', { component: 'com.shop/.Main', extras: [['s', 'server', 'http://host:3002']] }],
    ]);
  });

  it('인자가 비었거나 첫 화면을 모르면 앱을 끄기 전에 던진다', async () => {
    const 폰 = 가짜폰({ appPackage: 'com.shop' });
    await expect(인자로켜기(폰.driver, {})).rejects.toThrow('인자 없이 껐다 켜기는 앱다시켜기 다');
    await expect(인자로켜기(폰.driver, { a: 'b' })).rejects.toThrow('첫 화면(appActivity)이 없다');
    expect(폰.보낸).toEqual([['terminateApp', 'com.shop']]);
  });
});

describe('앱다시깔기 · 옛판에서올리기', () => {
  it('앱다시깔기 는 시험 대상 앱을 지우고 PLATFORM_APP 을 깐 뒤 켠다', async () => {
    vi.stubEnv('PLATFORM_APP', 'https://admin/api/builds/7/apk?exp=1&sig=s');
    const 폰 = 가짜폰();
    await 앱다시깔기(폰.driver);
    expect(폰.보낸).toEqual([
      ['mobile: removeApp', { appId: 'com.shop' }],
      ['mobile: installApp', { appPath: 'https://admin/api/builds/7/apk?exp=1&sig=s' }],
      ['activateApp', 'com.shop'],
    ]);
  });

  it('앱 파일이 패키지 이름(스토어 앱)이거나 없으면 지우기 전에 던진다', async () => {
    const 폰 = 가짜폰();
    vi.stubEnv('PLATFORM_APP', 'com.shop');
    await expect(앱다시깔기(폰.driver)).rejects.toThrow('패키지 이름으로 준 스토어 앱(com.shop)은 지우거나 다시 깔지 않는다');
    vi.stubEnv('PLATFORM_APP', '');
    await expect(앱다시깔기(폰.driver)).rejects.toThrow('깔 앱 파일(PLATFORM_APP)이 없다');
    expect(폰.보낸).toEqual([]);
  });

  it('옛판에서올리기 는 지우고 앞 빌드를 깔아 할일을 돌린 뒤 지금 판을 덮어 깔고 켠다 — 할일의 값을 돌려준다', async () => {
    vi.stubEnv('PLATFORM_APP', '/apk/new.apk');
    vi.stubEnv('PLATFORM_APP_PREVIOUS', '/apk/old.apk');
    const 폰 = 가짜폰();
    const 값 = await 옛판에서올리기(폰.driver, async () => {
      폰.보낸.push(['할일', null]);
      return 7;
    });
    expect(값).toBe(7);
    expect(폰.보낸).toEqual([
      ['mobile: removeApp', { appId: 'com.shop' }],
      ['mobile: installApp', { appPath: '/apk/old.apk' }],
      ['activateApp', 'com.shop'],
      ['할일', null],
      ['mobile: installApp', { appPath: '/apk/new.apk' }],
      ['activateApp', 'com.shop'],
    ]);
  });

  it('앞 빌드가 없으면 앱을 지우기 전에 까닭을 실어 던진다 — 조용히 넘기면 안 올려 본 채 초록이 된다', async () => {
    vi.stubEnv('PLATFORM_APP', '/apk/new.apk');
    vi.stubEnv('PLATFORM_APP_PREVIOUS', '');
    const 폰 = 가짜폰();
    const 할일 = vi.fn();
    await expect(옛판에서올리기(폰.driver, 할일)).rejects.toThrow('옛판에서올리기 — 앞 빌드가 없다');
    expect(할일).not.toHaveBeenCalled();
    expect(폰.보낸).toEqual([]);
  });

  it('할일이 던지면 지금 판을 덮어 깔아 두고 그 오류를 그대로 던진다 — 그것도 못 깔면 까닭을 덧붙이고, 서명 주소는 싣지 않는다', async () => {
    vi.stubEnv('PLATFORM_APP', 'https://admin/apk?sig=secret');
    vi.stubEnv('PLATFORM_APP_PREVIOUS', '/apk/old.apk');
    const 폰 = 가짜폰();
    await expect(옛판에서올리기(폰.driver, () => Promise.reject(new Error('로그인 버튼이 없다')))).rejects.toThrow(/^로그인 버튼이 없다$/);
    expect(폰.보낸.at(-1)).toEqual(['mobile: installApp', { appPath: 'https://admin/apk?sig=secret' }]);

    const 막힌폰 = 가짜폰(undefined, (명령, 인자) => 명령 === 'mobile: installApp' && (인자 as { appPath: string }).appPath.includes('sig='));
    const 오류 = await 옛판에서올리기(막힌폰.driver, () => Promise.reject(new Error('로그인 버튼이 없다'))).catch((e: unknown) => e as Error);
    expect(오류.message).toBe('로그인 버튼이 없다 (지금 판도 다시 못 깔았다 — 옛판에서올리기 — 지금 판을 못 깔았다 — 팜이 막았다)');
    expect(오류.stack).not.toContain('secret');
  });

  it('앞 빌드를 못 깔면 할일을 돌리지 않고 어느 판인지만 실어 던진다', async () => {
    vi.stubEnv('PLATFORM_APP', '/apk/new.apk');
    vi.stubEnv('PLATFORM_APP_PREVIOUS', 'https://admin/apk?sig=secret');
    const 폰 = 가짜폰(undefined, (명령) => 명령 === 'mobile: installApp');
    const 할일 = vi.fn();
    const 오류 = (await 옛판에서올리기(폰.driver, 할일).catch((e: unknown) => e)) as Error;
    expect(오류.message).toBe('옛판에서올리기 — 앞 빌드를 못 깔았다 — 팜이 막았다');
    expect(할일).not.toHaveBeenCalled();
  });
});

describe('웹 맥락', () => {
  it('웹뷰에서 구간 안에서는 생명 주기 부품을 못 쓴다', async () => {
    const 폰 = 가짜폰();
    await 웹뷰에서(폰.driver, async () => {
      await expect(뒤로보냈다오기(폰.driver, 1)).rejects.toThrow('뒤로보냈다오기 은 웹 맥락에서는 못 쓴다');
      await expect(앱비우기(폰.driver)).rejects.toThrow('앱비우기 은 웹 맥락에서는 못 쓴다');
      await expect(옛판에서올리기(폰.driver, async () => 1)).rejects.toThrow('옛판에서올리기 은 웹 맥락에서는 못 쓴다');
    });
    expect(폰.보낸).toEqual([]);
  });
});
