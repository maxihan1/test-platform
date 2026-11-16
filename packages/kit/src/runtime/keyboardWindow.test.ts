// 키보드 창 기다리기 검사 — 가짜 연결로 「못 찾았을 때만 · 키보드일 때만 · 사라지면 다시 찾기」를 본다 (도메인/러너 §5.2 「키보드 창 기다리기」)
import { describe, expect, it, vi } from 'vitest';

import type { AppDriver } from './app.js';
import { 키보드창기다리기 } from './keyboardWindow.js';

const 요소 = (id: string) => ({ 'element-6066-11e4-a52e-4f735466cecf': id });
const 못찾음 = { error: 'no such element', message: 'An element could not be located' };
const 키보드 = 'com.samsung.android.honeyboard';
const 앱 = 'org.joinmastodon.android';

type 덮개 = (원래: (u: string, v: string) => Promise<unknown>, u: string, v: string) => Promise<unknown>;

/** 맨 앞 창 꾸러미가 순서대로 바뀌는 가짜 연결. 앱 요소는 맨 앞이 앱일 때만 찾힌다 */
function 가짜연결(맨앞들: string[]) {
  let 차례 = 0;
  const 맨앞 = () => 맨앞들[Math.min(차례, 맨앞들.length - 1)] as string;
  const 덮개들: Record<string, 덮개> = {};
  const 찾은 = [] as string[];
  const 원래하나 = async (_using: string, value: string) => {
    if (value === '/hierarchy/*[1]') return 요소('root');
    찾은.push(value);
    return 맨앞() === 앱 ? 요소('btn') : 못찾음;
  };
  const 원래여럿 = async (using: string, value: string) => {
    const r = await 원래하나(using, value);
    return 'error' in (r as object) ? [] : [r];
  };
  const driver = {
    overwriteCommand: (이름: string, 함수: 덮개) => void (덮개들[이름] = 함수),
    getElementAttribute: async () => {
      const 지금 = 맨앞();
      차례 += 1;
      return 지금;
    },
  } as unknown as AppDriver;
  키보드창기다리기(driver, 200, 10);
  return {
    하나: (v: string) => (덮개들.findElement as 덮개)(원래하나, 'id', v),
    여럿: (v: string) => (덮개들.findElements as 덮개)(원래여럿, 'id', v),
    찾은,
  };
}

describe('키보드창기다리기', () => {
  it('키보드 창이 사라지면 다시 찾아 요소를 돌려준다', async () => {
    const 폰 = 가짜연결([키보드, 키보드, 앱]);
    expect(await 폰.하나('btn_poll')).toEqual(요소('btn'));
    expect(폰.찾은).toEqual(['btn_poll', 'btn_poll']);
  });

  it('맨 앞이 앱이면 기다리지 않고 못 찾음을 그대로 돌려준다', async () => {
    const 원래 = vi.fn(async () => 못찾음);
    const 덮개들: Record<string, 덮개> = {};
    const driver = {
      overwriteCommand: (이름: string, 함수: 덮개) => void (덮개들[이름] = 함수),
      getElementAttribute: async () => 앱,
    } as unknown as AppDriver;
    키보드창기다리기(driver, 200, 10);
    const 결과 = await (덮개들.findElement as 덮개)(async (_u, v) => (v === '/hierarchy/*[1]' ? 요소('root') : 원래()), 'id', 'btn_poll');
    expect(결과).toEqual(못찾음);
    expect(원래).toHaveBeenCalledTimes(1);
  });

  it('찾았으면 맨 앞 창을 보지 않는다', async () => {
    const 폰 = 가짜연결([앱]);
    expect(await 폰.여럿('btn_poll')).toEqual([요소('btn')]);
    expect(폰.찾은).toEqual(['btn_poll']);
  });

  it('여럿 찾기도 키보드 창이 사라지면 다시 찾는다', async () => {
    const 폰 = 가짜연결([키보드, 앱]);
    expect(await 폰.여럿('btn_poll')).toEqual([요소('btn')]);
  });

  it('끝까지 가리면 알림 한 줄을 남기고 못 찾음을 돌려준다', async () => {
    const 알림 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const 폰 = 가짜연결([키보드]);
    expect(await 폰.하나('btn_poll')).toEqual(못찾음);
    expect(알림).toHaveBeenCalledWith(expect.stringContaining(`키보드 창(${키보드})`));
    알림.mockRestore();
  });
});
