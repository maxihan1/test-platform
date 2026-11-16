// 키보드 창 기다리기 검사 — 가짜 연결로 「못 찾았을 때만 · 키보드 창일 때만 · 사라지면 다시 찾기」를 본다 (도메인/러너 §5.2 「키보드 창 기다리기」)
import { describe, expect, it, vi } from 'vitest';

import type { AppDriver } from './app.js';
import { 가림식, 키보드창기다리기 } from './keyboardWindow.js';

const 요소 = (id: string) => ({ 'element-6066-11e4-a52e-4f735466cecf': id });
const 못찾음 = { error: 'no such element', message: 'An element could not be located' };

type 원래 = (u: string, v: string) => Promise<unknown>;
type 덮개 = (원래: 원래, u: string, v: string) => Promise<unknown>;

/** 「가렸나」를 물을 때마다 차례로 답하는 가짜 연결. 앱 요소는 안 가렸을 때만 찾힌다 */
function 가짜연결(가림들: boolean[]) {
  let 차례 = 0;
  const 덮개들: Record<string, 덮개> = {};
  const 물음 = [] as string[];
  let 지금가림 = 가림들[0] ?? false;
  const 하나: 원래 = async (_u, v) => {
    물음.push(v);
    if (v === 가림식) {
      지금가림 = 가림들[Math.min(차례++, 가림들.length - 1)] ?? false;
      return 지금가림 ? 요소('tip') : 못찾음;
    }
    return 지금가림 ? 못찾음 : 요소('btn');
  };
  const 여럿: 원래 = async (u, v) => {
    const r = await 하나(u, v);
    return 'error' in (r as object) ? [] : [r];
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
  it('키보드 창이 사라지면 다시 찾아 요소를 돌려준다', async () => {
    const 폰 = 가짜연결([true, true, false]);
    expect(await 폰.하나('btn_poll')).toEqual(요소('btn'));
    expect(폰.물음.filter((v) => v === 'btn_poll')).toHaveLength(2);
  });

  it('맨 앞이 키보드 창이 아니면 한 번 묻고 기다리지 않는다', async () => {
    const 원래 = vi.fn(async (_u: string, _v: string) => 못찾음);
    const 덮개들: Record<string, 덮개> = {};
    키보드창기다리기({ overwriteCommand: (이름: string, 함수: 덮개) => void (덮개들[이름] = 함수) } as unknown as AppDriver, 200, 10);
    expect(await (덮개들.findElement as 덮개)(원래, 'id', 'btn_poll')).toEqual(못찾음);
    expect(원래.mock.calls.map((c) => c[1])).toEqual(['btn_poll', 가림식]);
  });

  it('찾았으면 맨 앞 창을 묻지 않는다', async () => {
    const 폰 = 가짜연결([false]);
    expect(await 폰.여럿('btn_poll')).toEqual([요소('btn')]);
    expect(폰.물음).toEqual(['btn_poll']);
  });

  it('여럿 찾기도 키보드 창이 사라지면 다시 찾는다', async () => {
    const 폰 = 가짜연결([true, false]);
    expect(await 폰.여럿('btn_poll')).toEqual([요소('btn')]);
  });

  it('끝까지 가리면 알림 한 줄을 남기고 못 찾음을 돌려준다', async () => {
    const 알림 = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const 폰 = 가짜연결([true]);
    expect(await 폰.하나('btn_poll')).toEqual(못찾음);
    expect(알림).toHaveBeenCalledWith(expect.stringContaining('키보드 창이'));
    알림.mockRestore();
  });

  it('맨 앞 창은 키보드 꾸러미이면서 화면 맨 위부터 덮는 창만 친다 — 아래에 붙는 보통 키보드는 안 친다', () => {
    expect(가림식).toContain("@package='com.samsung.android.honeyboard'");
    expect(가림식).toContain("starts-with(@bounds,'[0,0]')");
  });
});
