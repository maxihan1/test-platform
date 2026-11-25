// 조작 도우미 부르기 검사 — 한 프로세스로 돌리기 · 실패와 한도에서 입력 놓기 · 시간 배율 되돌리기 · 이번 로그만 · 기록 남기기 (도메인/게임 §3.10 「조작 도우미」)
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Command, Link } from 'control-cli';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { 게임자료환경 } from './authoring-check-game.js';
import { 돌린다, 실행, 조작도우미자리 } from './authoring-game-play.js';

const 도우미 = `
export async function 걷기(game, 키) {
  await game.keyDown(키);
  const 자리 = await game.get('/Player', 'Transform.position');
  await game.keyUp(키);
  return { 자리 };
}
export async function 던지기(game) {
  await game.keyDown('W');
  throw new Error('벽에 막힘 비밀값123');
}
export const 숫자 = 3;
`;

let 자리들: string[] = [];
afterEach(() => {
  for (const d of 자리들) rmSync(d, { recursive: true, force: true });
  자리들 = [];
  vi.restoreAllMocks();
});

function 트리(잡음 = true): string {
  const t = mkdtempSync(join(tmpdir(), 'game-play-'));
  자리들.push(t);
  mkdirSync(join(t, 'tests', 'g', 'helpers'), { recursive: true });
  mkdirSync(join(t, '.control-cli'));
  mkdirSync(join(t, 'data'));
  writeFileSync(join(t, 'tests', 'g', 'helpers', 'play.helper.ts'), 도우미);
  if (잡음) writeFileSync(join(t, '.control-cli', 'held'), 'pc-pc1\n');
  return t;
}

/** 가짜 게임 — 받은 명령을 적고 앞 번호 뒤의 로그만 준다 */
function 가짜(): { 길: Link; 명령: string[]; 배율: () => number } {
  const 명령: string[] = [];
  let 배율 = 1;
  const 로그 = ['앞 로그', '이번 로그'];
  const 길 = (async (c: Command) => {
    const cmd = c as unknown as Record<string, unknown>;
    명령.push([cmd.cmd, cmd.key].filter((x) => x !== undefined).join(' '));
    const 뒤 = (n: number) => 로그.slice(0, n).map((message, i) => ({ seq: i + 1, occurredAt: 't', type: 'Log', message, stack: '' })).filter((l) => l.seq > Number(cmd.since));
    switch (cmd.cmd) {
      case 'ping': return { ok: true, app: 'g', version: '1' };
      case 'get': return { ok: true, value: [1, 2, 3] };
      case 'timescale-get': return { ok: true, timeScale: 배율 };
      case 'timescale-set': 배율 = Number(cmd.scale); return { ok: true };
      case 'logs': return 명령.includes('key-up W') || 명령.includes('input-reset') ? { ok: true, last: 2, logs: 뒤(2) } : { ok: true, last: 1, logs: 뒤(1) };
      case 'errors': return { ok: true, last: 0, errors: [] };
      case 'events': return { ok: true, last: 0, events: [] };
      case 'screenshot': return { ok: true, jpg: Buffer.from('그림').toString('base64') };
      default: return { ok: true };
    }
  }) as unknown as Link;
  return { 길, 명령, 배율: () => 배율 };
}

describe('조작 도우미 부르기', () => {
  it('함수를 한 번에 돌리고 돌려준 값과 이번에 찍힌 로그만 찍고 기록을 남긴다', async () => {
    const t = 트리();
    const g = 가짜();
    const 찍힘 = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await 실행(['g', 'play', '걷기', '["W"]', '--max', '5'], t, { [게임자료환경]: join(t, 'data') }, g.길)).toBe(0);
    const 글 = 찍힘.mock.calls.map((c) => String(c[0])).join('\n');
    expect(글).toContain('걷기 끝');
    expect(글).toContain('게임 로그 1줄\n  t Log 이번 로그');
    expect(글).not.toContain('앞 로그');
    expect(글).toContain('"자리"');
    expect(g.명령.at(-1)).toBe('screenshot');
    expect(g.명령).not.toContain('timescale-set');
    const 남은 = readdirSync(join(t, 'data', 'game-play')).sort();
    expect(남은.map((x) => x.replace(/^\d+/, ''))).toEqual(['-걷기.jpg', '-걷기.json']);
    expect(JSON.parse(readFileSync(join(t, 'data', 'game-play', 남은[1]!), 'utf8'))).toMatchObject({ 함수: '걷기', 인자: ['W'], 값: { 자리: [1, 2, 3] }, 로그: ['t Log 이번 로그'] });
  });

  it('함수가 던지면 1 — 눌러 둔 입력을 놓고 오류에서 비밀번호를 가린다', async () => {
    const g = 가짜();
    const 찍힘 = vi.spyOn(console, 'log').mockImplementation(() => {});
    const 계정 = JSON.stringify([{ role: '일반 회원', loginId: 'qa', loginPassword: '비밀값123', baseUrl: 'http://x.test' }]);
    expect(await 실행(['g', 'play', '던지기'], 트리(), { PLATFORM_ACCOUNTS: 계정 }, g.길)).toBe(1);
    expect(g.명령).toContain('input-reset');
    expect(찍힘.mock.calls[0]?.[0]).toContain('오류: 벽에 막힘 ••••••');
  });

  it('한도를 넘기면 그 뒤 명령을 막고 입력을 놓고 시간 배율을 되돌린다', async () => {
    const g = 가짜();
    const r = await 돌린다(
      g.길,
      async (game) => {
        const d = game as { keyDown(k: string): Promise<void>; setTimeScale(n: number): Promise<void>; get(a: string, b: string): Promise<unknown> };
        await d.setTimeScale(0.25);
        await d.keyDown('W');
        for (;;) await d.get('/Player', 'Transform.position').catch(() => null).then(() => new Promise((다음) => setTimeout(다음, 2)));
      },
      {},
      60,
    );
    expect(r.오류).toContain('제한 시간');
    const 놓음 = g.명령.indexOf('input-reset');
    expect(놓음).toBeGreaterThan(g.명령.indexOf('key-down W'));
    expect(g.명령.slice(놓음)).not.toContain('get');
    expect(g.배율()).toBe(1);
  });

  it('늦게 답하는 누르기는 답을 기다렸다 놓고, 밖에서 끊어도 놓는다', async () => {
    const g = 가짜();
    const 끊기 = new AbortController();
    const 느린: Link = async (c) => {
      if ((c as unknown as { cmd: string }).cmd === 'key-down') {
        끊기.abort();
        await new Promise((다음) => setTimeout(다음, 150));
      }
      return g.길(c);
    };
    const r = await 돌린다(느린, (game) => (game as { keyDown(k: string): Promise<void> }).keyDown('W'), {}, 10_000, 끊기.signal);
    expect(r.오류).toBe('밖에서 명령을 끊었습니다');
    expect(g.명령).toContain('key-down W');
    expect(g.명령.indexOf('input-reset')).toBeGreaterThan(g.명령.indexOf('key-down W'));
  });

  it('기다리지 않은 일이 던져도 거두고, JSON 으로 못 바꾸는 값이어도 기록을 남긴다', async () => {
    const t = 트리();
    writeFileSync(join(t, 'tests', 'g', 'helpers', 'odd.helper.ts'), 'export function 이상한값() { void Promise.reject(new Error("뒤에서")); const a = {}; a.a = a; return new Promise((다음) => setTimeout(() => 다음(a), 20)); }\n');
    const g = 가짜();
    const 찍힘 = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await 실행(['g', 'odd', '이상한값'], t, { [게임자료환경]: join(t, 'data') }, g.길)).toBe(0);
    expect(찍힘.mock.calls.map((c) => String(c[0])).join('\n')).toContain('기다리지 않은 일이 던짐: 뒤에서');
    expect(readdirSync(join(t, 'data', 'game-play'))).toHaveLength(2);
    expect(g.명령).toContain('input-reset');
  });

  it('잡은 디바이스가 없거나 함수 · 인자 · 한도가 틀리면 2', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const g = 가짜();
    expect(await 실행(['g', 'play', '걷기'], 트리(false), {}, g.길)).toBe(2);
    expect(await 실행(['g', 'play', '숫자'], 트리(), {}, g.길)).toBe(2);
    expect(await 실행(['g', 'play', '걷기', '{}'], 트리(), {}, g.길)).toBe(2);
    expect(await 실행(['g', 'play', '걷기', '[]', '--max', '9999'], 트리(), {}, g.길)).toBe(2);
    expect(await 실행(['g', 'none', '걷기'], 트리(), {}, g.길)).toBe(2);
    const 깨짐 = 트리();
    writeFileSync(join(깨짐, 'tests', 'g', 'helpers', 'bad.helper.ts'), 'throw new Error("읽다 깨짐");');
    expect(await 실행(['g', 'bad', '걷기'], 깨짐, {}, g.길)).toBe(2);
    expect(g.명령).toEqual([]);
  });

  it('도우미 파일은 tests 안 일반 파일만 — 링크와 폴더 밖 이름은 안 된다', () => {
    const t = 트리();
    expect(조작도우미자리(t, 'g', 'play')).not.toBeNull();
    expect(조작도우미자리(t, '..', 'play')).toBeNull();
    expect(조작도우미자리(t, 'g', '../play')).toBeNull();
    expect(조작도우미자리(t, 'g', 'Play')).toBeNull();
    writeFileSync(join(t, 'out.ts'), '');
    symlinkSync(join(t, 'out.ts'), join(t, 'tests', 'g', 'helpers', 'link.helper.ts'));
    expect(조작도우미자리(t, 'g', 'link')).toBeNull();
  });
});
