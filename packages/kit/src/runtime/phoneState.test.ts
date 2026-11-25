// 폰 상태 구간 검사 — 가짜 폰으로 보내는 명령 · 되돌리기 · 러너용 파일 · 막힌 명령의 까닭 · 웹 맥락 막기를 본다 (도메인/러너 §5.2 「범용 앱 부품」 APP-F3-09)
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closeApp, phoneStateFile, type AppDriver } from './app.js';
import { 폰상태에서, 폰시각 } from './phoneState.js';
import { 웹뷰에서 } from './webview.js';

interface 상태 {
  방향: string;
  망: { wifi: boolean; data: boolean };
  밤: string;
  글자: string;
}

/** 상태를 쥔 가짜 폰 — 보낸 명령을 차례대로 모으고, 막을 명령을 정할 수 있다 */
function 가짜폰(처음: Partial<상태> = {}, 막을?: (명령: string, 인자: Record<string, unknown>) => boolean) {
  const 폰: 상태 = { 방향: 'PORTRAIT', 망: { wifi: true, data: false }, 밤: 'no', 글자: 'null', ...처음 };
  const 보낸 = [] as [string, unknown][];
  const 받는다 = (명령: string, 인자: Record<string, unknown> = {}): unknown => {
    보낸.push([명령, 인자]);
    if (막을?.(명령, 인자) === true) throw new Error('팜이 막았다');
    switch (명령) {
      case 'mobile: getConnectivity':
        return { ...폰.망 };
      case 'mobile: setConnectivity':
        폰.망 = { ...폰.망, ...(인자 as Partial<상태['망']>) };
        return null;
      case 'mobile: getUiMode':
        return 폰.밤;
      case 'mobile: setUiMode':
        폰.밤 = String(인자.value);
        return null;
      case 'mobile: shell': {
        const a = 인자.args as string[];
        if (a[0] === 'put') 폰.글자 = a[3]!;
        if (a[0] === 'delete') 폰.글자 = 'null';
        return a[0] === 'get' ? `${폰.글자}\n` : '';
      }
      case 'mobile: getDeviceTime':
        return 인자.format === 'YYYY-MM-DD' ? '2026-11-16\n' : '2026-11-16T09:30:00+09:00';
      default:
        return null;
    }
  };
  const driver = {
    execute: async (명령: string, 인자?: Record<string, unknown>) => 받는다(명령, 인자),
    getOrientation: async () => 받는다('getOrientation') ?? 폰.방향,
    setOrientation: async (방향: string) => {
      받는다('setOrientation', { 방향 });
      폰.방향 = 방향;
    },
    deleteSession: async () => void 받는다('deleteSession'),
    getContexts: async () => ['NATIVE_APP', 'WEBVIEW_com.shop'],
    switchContext: async () => undefined,
    waitUntil: async (조건: () => Promise<boolean>) => {
      if (!(await 조건())) throw new Error('timeout');
    },
    capabilities: { appPackage: 'com.shop' },
  } as unknown as AppDriver;
  return { driver, 폰, 보낸 };
}

let 폴더: string;
beforeEach(() => {
  폴더 = mkdtempSync(join(tmpdir(), 'phone-state-'));
  vi.stubEnv('PLATFORM_ARTIFACTS_DIR', 폴더);
  vi.stubEnv('PLATFORM_RUN_ID', '3');
  vi.stubEnv('PLATFORM_HISTORY_ID', '9');
});
afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(폴더, { recursive: true, force: true });
});

describe('폰상태에서', () => {
  it('구간 안에서만 다섯 상태가 바뀌고 끝나면 앞 값으로 돌아온다 — 구간 안에서는 러너용 되돌릴 요청이 연결 번호 파일 옆에 망부터 있다', async () => {
    const { driver, 폰 } = 가짜폰({ 글자: '1.15' });
    let 안: 상태 | undefined;
    let 파일: unknown;
    const 값 = await 폰상태에서(driver, { 방향: '가로', 네트워크: '끊김', 위치: { 위도: 37.5665, 경도: 126.978 }, 어두운화면: true, 글자크기: 1.3 }, async () => {
      안 = structuredClone(폰);
      파일 = JSON.parse(await readFile(phoneStateFile(), 'utf8'));
      return 7;
    });
    expect(값).toBe(7);
    expect(안).toEqual({ 방향: 'LANDSCAPE', 망: { wifi: false, data: false }, 밤: 'yes', 글자: '1.3' });
    expect(폰).toEqual({ 방향: 'PORTRAIT', 망: { wifi: true, data: false }, 밤: 'no', 글자: '1.15' });
    expect(phoneStateFile()).toBe(join(폴더, 'runs', '3', '9', 'appium-phone-state'));
    expect(파일).toEqual([
      { 경로: 'execute/sync', 본문: { script: 'mobile: setConnectivity', args: [{ wifi: true }] } },
      { 경로: 'orientation', 본문: { orientation: 'PORTRAIT' } },
      { 경로: 'execute/sync', 본문: { script: 'mobile: resetGeolocation', args: [{}] } },
      { 경로: 'execute/sync', 본문: { script: 'mobile: setUiMode', args: [{ mode: 'night', value: 'no' }] } },
      { 경로: 'execute/sync', 본문: { script: 'mobile: shell', args: [{ command: 'settings', args: ['put', 'system', 'font_scale', '1.15'] }] } },
    ]);
    expect(existsSync(phoneStateFile())).toBe(false);
  });

  it('네트워크는 켜져 있던 것만 끄고 켠다 — 모바일 데이터가 없는 폰에 데이터 명령을 안 보낸다 · 한 번도 안 바꾼 글자 크기는 지워서 되돌린다', async () => {
    const { driver, 보낸, 폰 } = 가짜폰();
    await 폰상태에서(driver, { 네트워크: '끊김', 글자크기: 2 }, async () => undefined);
    expect(보낸.filter(([명령]) => 명령 === 'mobile: setConnectivity')).toEqual([
      ['mobile: setConnectivity', { wifi: false }],
      ['mobile: setConnectivity', { wifi: true }],
    ]);
    expect(보낸.at(-1)).toEqual(['mobile: shell', { command: 'settings', args: ['delete', 'system', 'font_scale'] }]);
    expect(폰.글자).toBe('null');
  });

  it('이미 그 값인 상태는 바꾸지도 되돌리지도 않는다', async () => {
    const { driver, 보낸 } = 가짜폰({ 방향: 'LANDSCAPE', 밤: 'yes' });
    await 폰상태에서(driver, { 방향: '가로', 어두운화면: true }, async () => undefined);
    expect(보낸.map(([명령]) => 명령)).toEqual(['getOrientation', 'mobile: getUiMode']);
  });

  it('할일이 던져도 되돌리고 할일의 오류를 그대로 던진다', async () => {
    const { driver, 폰 } = 가짜폰();
    await expect(폰상태에서(driver, { 네트워크: '끊김' }, async () => Promise.reject(new Error('verify 실패')))).rejects.toThrow(/^verify 실패$/);
    expect(폰.망).toEqual({ wifi: true, data: false });
    expect(existsSync(phoneStateFile())).toBe(false);
  });

  it('팜이 막은 바꾸기는 까닭을 붙여 던지고 이미 바꾼 것은 되돌린다 — 할일은 돌지 않는다', async () => {
    const { driver, 폰 } = 가짜폰({}, (명령) => 명령 === 'mobile: setUiMode');
    const 할일 = vi.fn(async () => undefined);
    await expect(폰상태에서(driver, { 네트워크: '끊김', 어두운화면: true }, 할일)).rejects.toThrow('어두운 화면을 못 바꿨다 — 팜이 막았다');
    expect(할일).not.toHaveBeenCalled();
    expect(폰.망.wifi).toBe(true);
  });

  it('네트워크 답에 와이파이 · 데이터 켬 여부가 없으면 끊은 척 넘어가지 않고 던진다', async () => {
    for (const 답 of [null, { wifi: 'true', data: false }]) {
      const { driver } = 가짜폰({}, () => false);
      const 원래 = driver.execute.bind(driver);
      driver.execute = (async (명령: string, 인자?: unknown) => (명령 === 'mobile: getConnectivity' ? 답 : 원래(명령, 인자 as never))) as typeof driver.execute;
      const 할일 = vi.fn(async () => undefined);
      await expect(폰상태에서(driver, { 네트워크: '끊김' }, 할일)).rejects.toThrow('네트워크 상태를 못 읽었다 — 와이파이 · 모바일 데이터 켬 여부가 없는 답이다');
      expect(할일).not.toHaveBeenCalled();
    }
  });

  it('앞 값을 못 읽으면 아무것도 안 바꾸고 던진다 — 글자 크기는 폰 셸이 닫힌 까닭을 붙인다', async () => {
    const { driver, 보낸 } = 가짜폰({}, (명령, 인자) => 명령 === 'mobile: shell' && (인자.args as string[])[0] === 'get');
    await expect(폰상태에서(driver, { 네트워크: '끊김', 글자크기: 1.3 }, async () => undefined)).rejects.toThrow('글자 크기를 못 읽었다(디바이스 셸 — Device VISION 이 adb_shell 을 열어야 한다) — 팜이 막았다');
    expect(보낸.filter(([명령]) => 명령 === 'mobile: setConnectivity')).toEqual([]);
  });

  it('되돌리기에 실패하면 던진다 — 할일이 던졌으면 그 오류에 까닭을 덧붙이고, 파일은 지운다(kit 이 연결을 닫아 러너가 보낼 곳이 없고 다음 구간이 덮는다)', async () => {
    let 끄고나서 = false;
    const 막을 = (명령: string, 인자: Record<string, unknown>): boolean => {
      if (명령 === 'mobile: setConnectivity' && 인자.wifi === false) 끄고나서 = true;
      return 끄고나서 && 명령 === 'mobile: setConnectivity' && 인자.wifi === true;
    };
    await expect(폰상태에서(가짜폰({}, 막을).driver, { 네트워크: '끊김' }, async () => undefined)).rejects.toThrow('디바이스 상태를 구간 전으로 복원하지 못했다 — 네트워크: 팜이 막았다');
    expect(existsSync(phoneStateFile())).toBe(false);
    끄고나서 = false;
    const 오류 = await 폰상태에서(가짜폰({}, 막을).driver, { 네트워크: '끊김' }, async () => Promise.reject(new Error('verify 실패'))).catch((e: Error) => e);
    expect((오류 as Error).message).toBe('verify 실패 (폰 상태도 못 되돌렸다 — 네트워크: 팜이 막았다)');
    expect((오류 as Error).stack).toContain('(폰 상태도 못 되돌렸다 — 네트워크: 팜이 막았다)');
  });

  it('빈 값 · 틀린 값 · 겹친 구간 · 웹뷰 구간 안은 폰에 보내기 전에 던진다', async () => {
    const { driver, 보낸 } = 가짜폰();
    await expect(폰상태에서(driver, {}, async () => undefined)).rejects.toThrow('하나는 적어야 한다');
    await expect(폰상태에서(driver, { 위치: { 위도: 91, 경도: 0 } }, async () => undefined)).rejects.toThrow('위도 -90~90');
    await expect(폰상태에서(driver, { 글자크기: 0 }, async () => undefined)).rejects.toThrow('글자크기는 0 보다 크고 3 까지다');
    await expect(폰상태에서(driver, { 방향: 'landscape' as '가로' }, async () => undefined)).rejects.toThrow("방향은 '가로' · '세로' 다");
    await expect(폰상태에서(driver, { 어두운화면: true }, () => 폰상태에서(driver, { 글자크기: 1.3 }, async () => undefined))).rejects.toThrow('또 부를 수 없다');
    await expect(웹뷰에서(driver, () => 폰상태에서(driver, { 어두운화면: true }, async () => undefined))).rejects.toThrow('폰상태에서 은 웹 맥락에서는 못 쓴다');
    expect(보낸.filter(([명령]) => 명령.startsWith('mobile: set'))).toEqual([['mobile: setUiMode', { mode: 'night', value: 'yes' }], ['mobile: setUiMode', { mode: 'night', value: 'no' }]]);
  });
});

describe('closeApp — 구간 도중에 버려진 연결', () => {
  // Playwright 는 제한 시간에 걸린 본문을 멈춘 자리에서 버린다 — 구간의 되돌리기까지 못 간다
  const 구간에서멈춘다 = async (driver: AppDriver, 바꿀: Parameters<typeof 폰상태에서>[1], 감싸기 = (일: () => Promise<never>) => 일()): Promise<void> => {
    await new Promise<void>((들어옴) => {
      void 폰상태에서(driver, 바꿀, () =>
        감싸기(() => {
          들어옴();
          return new Promise<never>(() => undefined);
        }),
      );
    });
  };

  type 실행 = (명령: string, 인자?: Record<string, unknown>) => Promise<unknown>;
  const 닫힘 = ['deleteSession', {}];

  it('구간 도중에 버려진 연결을 닫으면 닫기 전에 되돌릴 요청을 망부터 보내고 파일을 지운다', async () => {
    const { driver, 폰, 보낸 } = 가짜폰();
    await 구간에서멈춘다(driver, { 네트워크: '끊김', 어두운화면: true });
    expect(폰).toMatchObject({ 망: { wifi: false, data: false }, 밤: 'yes' });
    보낸.length = 0;
    await closeApp(driver);
    expect(보낸).toEqual([['mobile: setConnectivity', { wifi: true }], ['mobile: setUiMode', { mode: 'night', value: 'no' }], 닫힘]);
    expect(폰).toMatchObject({ 망: { wifi: true, data: false }, 밤: 'no' });
    expect(existsSync(phoneStateFile())).toBe(false);
  });

  it('구간이 스스로 되돌린 연결은 닫기만 한다', async () => {
    const { driver, 보낸 } = 가짜폰();
    await 폰상태에서(driver, { 네트워크: '끊김' }, async () => undefined);
    보낸.length = 0;
    await closeApp(driver);
    expect(보낸).toEqual([닫힘]);
  });

  it('못 되돌려도 던지지 않고 알린 뒤 닫는다 — 하나가 막혀도 나머지는 보내고, 러너가 다시 보낼 파일은 남긴다', async () => {
    const 알림 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let 막기 = false;
    const { driver, 폰, 보낸 } = 가짜폰({}, (명령) => 막기 && 명령 === 'mobile: setConnectivity');
    await 구간에서멈춘다(driver, { 네트워크: '끊김', 어두운화면: true });
    막기 = true;
    await closeApp(driver);
    expect(알림).toHaveBeenCalledWith(expect.stringContaining('네트워크: 팜이 막았다'));
    expect(폰.밤).toBe('no');
    expect(보낸.at(-1)).toEqual(닫힘);
    expect(existsSync(phoneStateFile())).toBe(true);
    알림.mockRestore();
  });

  it('웹뷰 구간 안에서 버려졌으면 네이티브로 가서 보낸다 — 닫는 길이라 웹으로 돌아가지 않는다', async () => {
    const { driver, 폰 } = 가짜폰();
    const 맥락 = vi.fn(async (_이름: string) => undefined);
    (driver as unknown as { switchContext: typeof 맥락 }).switchContext = 맥락;
    await 구간에서멈춘다(driver, { 네트워크: '끊김' }, (일) => 웹뷰에서(driver, 일));
    await closeApp(driver);
    expect(폰.망.wifi).toBe(true);
    expect(맥락.mock.calls.map(([이름]) => 이름)).toEqual(['WEBVIEW_com.shop', 'NATIVE_APP']);
  });

  it('바꾸는 도중에 버려졌으면 닫은 뒤 남은 바꾸기를 마저 보내지 않는다', async () => {
    const { driver, 보낸 } = 가짜폰();
    const 손 = driver as unknown as { execute: 실행 };
    const 원래 = 손.execute;
    let 풀기 = (): void => undefined;
    const 문 = new Promise<void>((풀림) => (풀기 = 풀림));
    let 끝: Promise<unknown> = Promise.resolve();
    // 와이파이 끄기 요청이 답을 기다리는 사이에 제한 시간이 온 꼴
    await new Promise<void>((걸림) => {
      손.execute = async (명령, 인자) => {
        if (명령 === 'mobile: setConnectivity' && 인자?.wifi === false) {
          걸림();
          await 문;
        }
        return 원래(명령, 인자);
      };
      끝 = 폰상태에서(driver, { 네트워크: '끊김', 어두운화면: true }, async () => undefined).catch((err: unknown) => err);
    });
    await closeApp(driver);
    풀기();
    expect(await 끝).toBeInstanceOf(Error);
    // 어두운 화면 켜기는 안 나가고, 닫는 쪽의 되돌리기 하나뿐이다
    expect(보낸.filter(([명령]) => 명령 === 'mobile: setUiMode')).toEqual([['mobile: setUiMode', { mode: 'night', value: 'no' }]]);
  });

  it('폰이 되돌리기에 답하지 않으면 15초 뒤 알리고 닫는다', async () => {
    const 알림 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { driver, 보낸 } = 가짜폰();
    await 구간에서멈춘다(driver, { 네트워크: '끊김' });
    (driver as unknown as { execute: 실행 }).execute = () => new Promise<never>(() => undefined);
    vi.useFakeTimers();
    try {
      const 닫기 = closeApp(driver);
      await vi.advanceTimersByTimeAsync(15_000);
      await 닫기;
    } finally {
      vi.useRealTimers();
    }
    expect(알림).toHaveBeenCalledWith(expect.stringContaining('15초 안에 답이 없다'));
    expect(보낸.at(-1)).toEqual(닫힘);
    알림.mockRestore();
  });
});

describe('폰시각', () => {
  it('getDeviceTime 에 꼴을 실어 읽고 끝 줄바꿈을 뗀다 — 못 읽으면 까닭을 붙여 던진다', async () => {
    const { driver } = 가짜폰();
    expect(await 폰시각(driver)).toBe('2026-11-16T09:30:00+09:00');
    expect(await 폰시각(driver, 'YYYY-MM-DD')).toBe('2026-11-16');
    await expect(폰시각(가짜폰({}, () => true).driver)).rejects.toThrow('폰 시각을 못 읽었다 — 팜이 막았다');
  });
});
