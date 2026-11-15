// 앱 공용 부품 검사 — 가짜 driver 로 갈래 · 되돌리기 · 낡은 요소 다시 읽기를 본다 (도메인/러너 §5.2 「앱 공용 부품」)
import { describe, expect, it, vi } from 'vitest';

import type { AppDriver } from './app.js';
import { 권한창답하기, 두번누르기, 먼저뜨는것, 스크롤해서찾기, 움직이는화면에서, 칸에적기, 토스트글, type 앱요소 } from './appParts.js';

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
    const 칸 = { clearValue: vi.fn(), setValue: vi.fn() };
    await 칸에적기(칸 as unknown as 앱요소, '홍길동');
    await 칸에적기(칸 as unknown as 앱요소, '');
    expect(칸.clearValue).toHaveBeenCalledTimes(2);
    expect(칸.setValue.mock.calls).toEqual([['홍길동']]);
  });

  it('하나라도 눌렸으면 넘어가고 둘 다 실패했을 때만 던진다', async () => {
    const 한번만 = { click: vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('화면이 넘어갔다')) };
    await expect(두번누르기(한번만 as unknown as 앱요소)).resolves.toBeUndefined();
    const 둘다 = { click: vi.fn().mockRejectedValue(new Error('요소 없음')) };
    await expect(두번누르기(둘다 as unknown as 앱요소)).rejects.toThrow('요소 없음');
  });
});
