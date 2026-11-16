// 앱 공용 부품 검사 — 가짜 driver 로 갈래 · 되돌리기 · 낡은 요소 다시 읽기를 본다 (도메인/러너 §5.2 「앱 공용 부품」)
import { describe, expect, it, vi } from 'vitest';

import type { AppDriver } from './app.js';
import { 권한상태에서, 권한창답하기, 두번누르기, 먼저뜨는것, 스크롤해서찾기, 알림창열기, 움직이는화면에서, 칸에적기, 토스트글, type 앱요소 } from './appParts.js';

/** 선택자마다 보이는지 · 글을 정해 주는 가짜 폰. waitUntil 은 시간 안에 몇 번 되풀이하다 못 되면 던진다 */
function 가짜폰(화면: () => Record<string, string | (() => string)>) {
  const 누른 = [] as string[];
  const 설정 = [] as unknown[];
  const 요소 = (선택자: string) => ({
    isExisting: async () => 선택자 in 화면(),
    isDisplayed: async () => 선택자 in 화면(),
    getText: async () => {
      const 값 = 화면()[선택자];
      if (값 === undefined) throw new Error('stale element');
      return typeof 값 === 'function' ? 값() : 값;
    },
    click: async () => void 누른.push(선택자),
    $: (안: string) => 요소(`${선택자} ${안}`),
  });
  const driver = {
    $: 요소,
    waitUntil: async (조건: () => Promise<boolean>) => {
      for (let i = 0; i < 5; i++) if (await 조건()) return true;
      throw new Error('timeout');
    },
    updateSettings: async (값: unknown) => void 설정.push(값),
  } as unknown as AppDriver;
  return { driver, 누른, 설정 };
}

describe('먼저뜨는것', () => {
  it('보이는 후보의 이름을 돌려주고 아무것도 안 뜨면 undefined 다', async () => {
    const 홈 = 가짜폰(() => ({ 'id=tab_home': '' }));
    expect(await 먼저뜨는것(홈.driver, { 시작: 'id=btn_log_in', 홈: 'id=tab_home' })).toBe('홈');
    expect(await 먼저뜨는것(가짜폰(() => ({})).driver, { 시작: 'id=btn_log_in' })).toBeUndefined();
  });

  it('늦게 뜨는 화면도 기다려 잡는다', async () => {
    let 번 = 0;
    const 폰 = 가짜폰((): Record<string, string> => (++번 > 4 ? { 'id=btn_log_in': '' } : {}));
    expect(await 먼저뜨는것(폰.driver, { 시작: 'id=btn_log_in', 홈: 'id=tab_home' })).toBe('시작');
  });
});

describe('권한창답하기', () => {
  it('권한 창이 떠 있으면 답에 맞는 단추를 누른다 — 「앱 사용 중에만 허용」도 허용이다', async () => {
    const 폰 = 가짜폰(() => ({ 'id=com.android.permissioncontroller:id/permission_allow_foreground_only_button': '', 'id=com.android.permissioncontroller:id/permission_deny_button': '' }));
    expect(await 권한창답하기(폰.driver, '허용')).toBe(true);
    expect(await 권한창답하기(폰.driver, '거부')).toBe(true);
    expect(폰.누른).toEqual(['id=com.android.permissioncontroller:id/permission_allow_foreground_only_button', 'id=com.android.permissioncontroller:id/permission_deny_button']);
  });

  it('안 뜨면 누르지 않고 false 다 — 데이터를 남긴 연결은 이미 답한 창이 안 뜬다', async () => {
    const 폰 = 가짜폰(() => ({}));
    expect(await 권한창답하기(폰.driver, '허용')).toBe(false);
    expect(폰.누른).toEqual([]);
  });
});

describe('토스트글', () => {
  it('글 칸이 있으면 그 글을, 없으면 상자의 글을 읽는다', async () => {
    expect(await 토스트글(가짜폰(() => ({ 'id=toast': '상자', 'id=toast android.widget.TextView': '저장했습니다' })).driver, 'id=toast')).toBe('저장했습니다');
    expect(await 토스트글(가짜폰(() => ({ '//android.widget.Toast': '복사됨' })).driver, '//android.widget.Toast')).toBe('복사됨');
  });

  it('읽는 사이 사라져 던지면 다시 읽고, 끝내 못 읽으면 빈 글이다', async () => {
    let 번 = 0;
    const 깜빡 = 가짜폰(() => ({
      'id=toast': () => {
        if (++번 < 3) throw new Error('stale element');
        return '담았습니다';
      },
    }));
    expect(await 토스트글(깜빡.driver, 'id=toast')).toBe('담았습니다');
    expect(await 토스트글(가짜폰(() => ({})).driver, 'id=toast')).toBe('');
  });
});

describe('움직이는화면에서', () => {
  it('구간 동안만 낮추고 끝나면 기본값으로 되돌린다 — 던져도 되돌린다', async () => {
    const 폰 = 가짜폰(() => ({}));
    expect(await 움직이는화면에서(폰.driver, async () => '값')).toBe('값');
    await expect(움직이는화면에서(폰.driver, async () => Promise.reject(new Error('본문 실패')), 0)).rejects.toThrow('본문 실패');
    expect(폰.설정).toEqual([{ waitForIdleTimeout: 1000 }, { waitForIdleTimeout: 10_000 }, { waitForIdleTimeout: 0 }, { waitForIdleTimeout: 10_000 }]);
  });

  it('겹쳐 쓰면 안쪽이 끝날 때 바깥 구간의 값으로 돌아간다', async () => {
    const 폰 = 가짜폰(() => ({}));
    await 움직이는화면에서(폰.driver, () => 움직이는화면에서(폰.driver, async () => undefined, 0), 2000);
    expect(폰.설정).toEqual([{ waitForIdleTimeout: 2000 }, { waitForIdleTimeout: 0 }, { waitForIdleTimeout: 2000 }, { waitForIdleTimeout: 10_000 }]);
  });

  it('되돌리기가 실패해도 본문의 실패 까닭을 덮지 않는다', async () => {
    const 폰 = 가짜폰(() => ({}));
    let 번 = 0;
    (폰.driver as unknown as { updateSettings: () => Promise<void> }).updateSettings = async () => {
      if (++번 > 1) throw new Error('연결이 끊겼다');
    };
    const 알림 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(움직이는화면에서(폰.driver, async () => Promise.reject(new Error('본문 실패')))).rejects.toThrow('본문 실패');
    expect(알림).toHaveBeenCalledWith('[kit] 화면 멈춤 기다림을 되돌리지 못했다: 연결이 끊겼다');
    알림.mockRestore();
  });
});

describe('스크롤해서찾기', () => {
  it('한 번만 묻고, 못 찾으면 던진다 — 이 선택자는 물을 때마다 목록을 다시 굴린다', async () => {
    const 물음 = vi.fn();
    const driver = { $: (선택자: string) => ({ getElement: async () => (물음(선택자), { elementId: undefined }) }) } as unknown as AppDriver;
    await expect(스크롤해서찾기(driver, '없는 글')).rejects.toThrow('「없는 글」가 든 요소를 굴려도 찾지 못했다');
    expect(물음).toHaveBeenCalledTimes(1);
  });
});

describe('칸에적기 · 두번누르기', () => {
  it('비우고 적는다 — 빈 글이면 비우기만 한다', async () => {
    const 칸 = { clearValue: vi.fn(), addValue: vi.fn() };
    await 칸에적기(칸 as unknown as 앱요소, '홍길동');
    await 칸에적기(칸 as unknown as 앱요소, '');
    expect(칸.clearValue).toHaveBeenCalledTimes(2);
    expect(칸.addValue.mock.calls).toEqual([['홍길동']]);
  });

  it('긴 글은 2,000자씩 나눠 이어 붙인다 — 폰의 UiAutomator2 가 요청을 64KB 까지만 받아 한글 10,000자를 한 번에 보내면 413 이다', async () => {
    const 칸 = { clearValue: vi.fn(), addValue: vi.fn() };
    const 글 = `${'가'.repeat(4_499)}😀`;
    await 칸에적기(칸 as unknown as 앱요소, 글);
    expect(칸.clearValue).toHaveBeenCalledTimes(1);
    const 조각 = 칸.addValue.mock.calls.map(([v]) => v as string);
    expect(조각.map((v) => Array.from(v).length)).toEqual([2_000, 2_000, 500]);
    expect(조각.join('')).toBe(글);
  });

  it('하나라도 눌렸으면 넘어가고 둘 다 실패했을 때만 던진다', async () => {
    const 한번만 = { click: vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('화면이 넘어갔다')) };
    await expect(두번누르기(한번만 as unknown as 앱요소)).resolves.toBeUndefined();
    const 둘다 = { click: vi.fn().mockRejectedValue(new Error('요소 없음')) };
    await expect(두번누르기(둘다 as unknown as 앱요소)).rejects.toThrow('요소 없음');
  });
});

const 카메라 = 'android.permission.CAMERA';
const 위치 = 'android.permission.ACCESS_FINE_LOCATION';
const 알림 = 'android.permission.POST_NOTIFICATIONS';

/** 권한을 기억하는 가짜 폰 — 막을 동작(grant · revoke)을 주면 그 동작을 거절한다 */
function 권한폰(처음: string[], 막을: { action?: string; 번째?: number } = {}) {
  const 줌 = new Set(처음);
  const 기록 = [] as string[];
  let 바꾼수 = 0;
  const driver = {
    capabilities: { appPackage: 'com.shop' },
    execute: async (script: string, arg: { type?: string; permissions?: string[]; appPackage?: string; action?: string }) => {
      if (script === 'mobile: openNotifications') return void 기록.push('알림 창');
      if (script === 'mobile: getPermissions') {
        if (arg.type !== 'granted' || arg.appPackage !== 'com.shop') throw new Error(`엉뚱한 물음 ${arg.type} ${arg.appPackage}`);
        return [...줌];
      }
      바꾼수++;
      if (arg.action === 막을.action && (막을.번째 === undefined || 막을.번째 === 바꾼수)) throw new Error('pm 이 막혔다');
      기록.push(`${arg.action} ${arg.permissions!.join(',')} @${arg.appPackage}`);
      for (const 이름 of arg.permissions!) (arg.action === 'grant' ? 줌.add(이름) : 줌.delete(이름));
    },
    terminateApp: async (꾸러미: string) => void 기록.push(`끄기 ${꾸러미}`),
    activateApp: async (꾸러미: string) => void 기록.push(`켜기 ${꾸러미}`),
  } as unknown as AppDriver;
  return { driver, 기록, 줌 };
}

describe('알림창열기', () => {
  it('알림 창을 내린다', async () => {
    const 폰 = 권한폰([]);
    await 알림창열기(폰.driver);
    expect(폰.기록).toEqual(['알림 창']);
  });
});

describe('권한상태에서', () => {
  it('구간 안에서만 시험 대상 앱의 권한을 주고 빼고, 끝나면 바뀐 것만 되돌린다 — 준 권한을 뺄 때마다 꺼진 앱을 다시 켠다', async () => {
    const 폰 = 권한폰([위치, 알림]);
    const 값 = await 권한상태에서(폰.driver, { 준다: [카메라, 알림], 뺀다: [위치] }, async () => {
      expect([...폰.줌].sort()).toEqual([카메라, 알림].sort());
      return '지도 화면';
    });
    expect(값).toBe('지도 화면');
    expect([...폰.줌].sort()).toEqual([위치, 알림].sort());
    expect(폰.기록).toEqual([
      `grant ${카메라},${알림} @com.shop`,
      `revoke ${위치} @com.shop`,
      '끄기 com.shop',
      '켜기 com.shop',
      `grant ${위치} @com.shop`,
      `revoke ${카메라} @com.shop`,
      '끄기 com.shop',
      '켜기 com.shop',
    ]);
  });

  it('안 준 권한을 빼는 것은 바꿀 것이 없어 앱을 끄고 켜지 않는다', async () => {
    const 폰 = 권한폰([]);
    await 권한상태에서(폰.driver, { 뺀다: [카메라] }, async () => undefined);
    expect(폰.기록).toEqual([]);
  });

  it('할일이 던져도 되돌리고 그 오류를 그대로 던진다', async () => {
    const 폰 = 권한폰([]);
    await expect(
      권한상태에서(폰.driver, { 준다: [카메라] }, async () => {
        throw new Error('사진 버튼이 없다');
      }),
    ).rejects.toThrow(/^사진 버튼이 없다$/);
    expect([...폰.줌]).toEqual([]);
  });

  it('주기가 막히면 어떤 권한을 못 줬는지 실어 던진다', async () => {
    const 폰 = 권한폰([], { action: 'grant' });
    const 할일 = vi.fn();
    await expect(권한상태에서(폰.driver, { 준다: [카메라] }, 할일)).rejects.toThrow(`권한을 못 줬다(${카메라}) — pm 이 막혔다`);
    expect(할일).not.toHaveBeenCalled();
  });

  it('되돌리기가 막히면 던지고, 할일이 이미 던졌으면 그 오류에 까닭을 덧붙인다', async () => {
    await expect(권한상태에서(권한폰([], { action: 'revoke' }).driver, { 준다: [카메라] }, async () => '끝')).rejects.toThrow(
      `권한을 구간 전으로 못 되돌렸다 — 권한을 못 뺐다(${카메라}) — pm 이 막혔다`,
    );
    await expect(
      권한상태에서(권한폰([], { action: 'revoke' }).driver, { 준다: [카메라] }, async () => {
        throw new Error('사진 버튼이 없다');
      }),
    ).rejects.toThrow(`사진 버튼이 없다 (권한도 못 되돌렸다 — 권한을 못 뺐다(${카메라}) — pm 이 막혔다)`);
    await expect(
      권한상태에서(권한폰([], { action: 'revoke' }).driver, { 준다: [카메라] }, async () => {
        throw '글로 던짐';
      }),
    ).rejects.toThrow(`글로 던짐 (권한도 못 되돌렸다 — 권한을 못 뺐다(${카메라}) — pm 이 막혔다)`);
  });

  it('바꿀 것이 없거나 같은 권한을 주고 빼거나 연결에 꾸러미가 없으면 손대기 전에 던진다', async () => {
    const 폰 = 권한폰([]);
    await expect(권한상태에서(폰.driver, {}, async () => undefined)).rejects.toThrow('준다 · 뺀다 가운데 하나는');
    await expect(권한상태에서(폰.driver, { 준다: [카메라], 뺀다: [카메라] }, async () => undefined)).rejects.toThrow('같은 권한을 주고 뺄 수 없다');
    await expect(권한상태에서(폰.driver, { 뺀다: ['ACCESS_FINE_LOCATION'] }, async () => undefined)).rejects.toThrow('온 이름(android.permission.…)으로 적는다: ACCESS_FINE_LOCATION');
    const 꾸러미없음 = { ...폰.driver, capabilities: {} } as unknown as AppDriver;
    await expect(권한상태에서(꾸러미없음, { 준다: [카메라] }, async () => undefined)).rejects.toThrow('시험 대상 앱 꾸러미(appPackage)가 없다');
    expect(폰.기록).toEqual([]);
  });
});
