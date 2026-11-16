// 키보드 창 기다리기 검사 — 가짜 연결로 「못 찾았을 때만 · 앱 화면이 비었을 때만 · 다시 보이면 다시 찾기」를 본다 (도메인/러너 §5.2 「키보드 창 기다리기」)
import { describe, expect, it, vi } from 'vitest';

import type { AppDriver } from './app.js';
import { 빈화면식, 키보드창기다리기 } from './keyboardWindow.js';

const 요소 = (id: string) => ({ 'element-6066-11e4-a52e-4f735466cecf': id });
const 못찾음 = { error: 'no such element', message: 'An element could not be located' };

type 원래 = (u: string, v: string) => Promise<unknown>;
type 덮개 = (원래: 원래, u: string, v: string) => Promise<unknown>;

/** 「비었나」를 물을 때마다 차례로 답하는 가짜 연결. 앱 요소는 안 가렸을 때만 찾힌다 — 가린 동안 앱 창은 맨 바깥 틀만 남는다 */
function 가짜연결(가림들: boolean[]) {
  let 차례 = 0;
  const 덮개들: Record<string, 덮개> = {};
  const 물음 = [] as string[];
  let 지금가림 = 가림들[0] ?? false;
  const 여럿: 원래 = async (_u, v) => {
    물음.push(v);
    if (v === 빈화면식) {
      지금가림 = 가림들[Math.min(차례++, 가림들.length - 1)] ?? false;
      return 지금가림 ? [] : [요소('root-child')];
    }
    return 지금가림 ? [] : [요소('btn')];
  };
  const 하나: 원래 = async (u, v) => {
    const r = (await 여럿(u, v)) as unknown[];
    return r[0] ?? 못찾음;
  };
  const driver = { overwriteCommand: (이름: string, 함수: 덮개) => void (덮개들[이름] = 함수) } as unknown as AppDriver;
  키보드창기다리기(driver, 200, 10);
  return {
    하나: (v: string) => (덮개들.findElement as 덮개)(하나, 'id', v),
    여럿: (v: string) => (덮개들.findElements as 덮개)(여럿, 'id', v),
    물음,
  };
}

describe('키보드창기다리기', () => {
  it('앱 화면이 비었다가 다시 보이면 다시 찾아 요소를 돌려준다', async () => {
    const 폰 = 가짜연결([true, true, false]);
    expect(await 폰.하나('btn_poll')).toEqual(요소('btn'));
    expect(폰.물음.filter((v) => v === 'btn_poll')).toHaveLength(2);
  });

  it('앱 화면이 안 비었으면 맨 바깥 틀 안을 xpath 로 한 번 묻고 기다리지 않는다', async () => {
    const 원래 = vi.fn(async (u: string, _v: string) => (u === 'xpath' ? 요소('root-child') : 못찾음));
    const 덮개들: Record<string, 덮개> = {};
    키보드창기다리기({ overwriteCommand: (이름: string, 함수: 덮개) => void (덮개들[이름] = 함수) } as unknown as AppDriver, 200, 10);
    expect(await (덮개들.findElement as 덮개)(원래, 'id', 'btn_poll')).toEqual(못찾음);
    expect(원래.mock.calls).toEqual([['id', 'btn_poll'], ['xpath', 빈화면식]]);
  });

  it('찾았으면 앱 화면을 묻지 않는다', async () => {
    const 폰 = 가짜연결([false]);
    expect(await 폰.여럿('btn_poll')).toEqual([요소('btn')]);
    expect(폰.물음).toEqual(['btn_poll']);
  });

  it('여럿 찾기도 앱 화면이 다시 보이면 다시 찾는다', async () => {
    const 폰 = 가짜연결([true, false]);
    expect(await 폰.여럿('btn_poll')).toEqual([요소('btn')]);
  });

  it('끝까지 비면 알림 한 줄을 남기고 못 찾음을 돌려준다', async () => {
    const 알림 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const 폰 = 가짜연결([true]);
    expect(await 폰.하나('btn_poll')).toEqual(못찾음);
    expect(알림).toHaveBeenCalledWith(expect.stringContaining('비어 보였다'));
    알림.mockRestore();
  });
});
