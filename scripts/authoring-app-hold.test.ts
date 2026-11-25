// 앱 작성이 잡은 폰을 늘려 쥐는 것과 늘린 폰을 끝에 놓는 것의 테스트
import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 마지막늘림, 잡기한번늘리기 } from './authoring-app-hold.js';
import { 잡은폰놓기 } from './authoring-app-screen.js';

let 트리: string;
beforeEach(() => {
  트리 = mkdtempSync(join(tmpdir(), 'app-hold-'));
  mkdirSync(join(트리, '.appium-cli'));
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  rmSync(트리, { recursive: true, force: true });
  vi.restoreAllMocks();
});

const 팜 = 'http://farm:4000';
const 탐색 = { url: `${팜}/wd/hub`, app: 'https://x/app.apk' };
const 기록 = (이름: string, 글: string) => writeFileSync(join(트리, '.appium-cli', 이름), 글);
const 답 = (status: number) => vi.fn(async (_주소: string, _설정?: RequestInit) => new Response(null, { status }));

describe('잡기한번늘리기', () => {
  it('AI 가 잡은 폰만 팜 hold/extend 를 토큰으로 부르고, 받으면 늘린 때를 적는다 — 폰 돌려 보기가 남긴 폰은 안 늘린다', async () => {
    기록('held', 'R58N\n');
    기록('held-PX7', 'PX7');
    const 부름 = 답(200);
    await 잡기한번늘리기(트리, 팜, 'pat_1', 7, '/자료/a', 부름 as unknown as typeof fetch, 1_000);
    expect(부름.mock.calls.map((c) => [c[0], (c[1] as RequestInit).method, (c[1] as RequestInit).headers])).toEqual([
      [`${팜}/api/devices/R58N/hold/extend`, 'POST', { authorization: 'Bearer pat_1' }],
    ]);
    expect(마지막늘림('/자료/a', 'R58N')).toBe(1_000);
    expect(마지막늘림('/자료/b', 'R58N')).toBe(0);
  });

  it('게임 학습은 control-cli 기록의 PC 를 늘린다 — 앱 기록은 안 본다', async () => {
    기록('held', 'R58N');
    mkdirSync(join(트리, '.control-cli'));
    writeFileSync(join(트리, '.control-cli', 'held'), 'pc-pc1\n');
    const 부름 = 답(200);
    await 잡기한번늘리기(트리, 팜, undefined, 7, '/자료/g', 부름 as unknown as typeof fetch, 1_000, '.control-cli');
    expect(부름.mock.calls.map((c) => c[0])).toEqual([`${팜}/api/devices/pc-pc1/hold/extend`]);
  });

  it('409(아직 10분 넘게 남음)는 늘린 것으로 안 치고 조용히 넘긴다 · 폰 번호 꼴이 아니면 안 부른다', async () => {
    기록('held', 'R58N');
    기록('held-x', '../../etc');
    const 부름 = 답(409);
    await 잡기한번늘리기(트리, 팜, undefined, 7, '/자료/c', 부름 as unknown as typeof fetch, 5);
    expect(부름).toHaveBeenCalledTimes(1);
    expect(마지막늘림('/자료/c', 'R58N')).toBe(0);
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe('잡은폰놓기 — 늘린 잡기', () => {
  it('30분 넘은 기록이어도 늘린 때부터 30분 안이면 놓는다', async () => {
    기록('held', 'R58N');
    const 옛날 = new Date(Date.now() - 2 * 60 * 60_000);
    utimesSync(join(트리, '.appium-cli', 'held'), 옛날, 옛날);
    const 지금 = Date.now();
    await 잡기한번늘리기(트리, 팜, undefined, 7, '/자료/d', 답(200) as unknown as typeof fetch, 지금 - 10 * 60_000);
    const 놓기 = 답(200);
    await 잡은폰놓기(트리, { 글: 'x', 탐색 }, 7, 놓기 as unknown as typeof fetch, 지금, '/자료/d');
    expect(놓기.mock.calls.map((c) => [c[0], (c[1] as RequestInit).method])).toEqual([[`${팜}/api/devices/R58N/hold`, 'DELETE']]);
    expect(existsSync(join(트리, '.appium-cli', 'held'))).toBe(false);
    expect(마지막늘림('/자료/d', 'R58N')).toBe(0);
  });

  it('늘린 적 없는 30분 넘은 기록은 놓지 않고 지운다(팜이 이미 풀었다)', async () => {
    기록('held', 'R58N');
    const 옛날 = new Date(Date.now() - 31 * 60_000);
    utimesSync(join(트리, '.appium-cli', 'held'), 옛날, 옛날);
    const 놓기 = 답(200);
    await 잡은폰놓기(트리, { 글: 'x', 탐색 }, 7, 놓기 as unknown as typeof fetch, Date.now(), '/자료/e');
    expect(놓기).not.toHaveBeenCalled();
    expect(existsSync(join(트리, '.appium-cli', 'held'))).toBe(false);
  });
});
