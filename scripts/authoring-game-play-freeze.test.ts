// 멈춰 가며 하기 검사 — 끝나면 멈추고 표시를 쓰기 · 부르기 직전에 풀기 · 표시 없이는 안 풀기 · 멈춤 명령이 던져도 입력 놓기 (도메인/게임 §3.10 「조작 도우미」)
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Command, Link } from 'control-cli';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { 게임자료환경 } from './authoring-check-game.js';
import { 멈춤표시읽기, 멈춤표시쓰기 } from './authoring-game-freeze.js';
import { 멈춤줄 } from './authoring-game-play-log.js';
import { 돌린다, 실행 } from './authoring-game-play.js';

let 자리들: string[] = [];
afterEach(() => {
  for (const d of 자리들) rmSync(d, { recursive: true, force: true });
  자리들 = [];
  vi.restoreAllMocks();
});
const 새자료 = (): string => {
  const d = mkdtempSync(join(tmpdir(), 'game-freeze-play-'));
  자리들.push(d);
  return d;
};

/** 가짜 게임 — 시간 배율을 기억하고 명령을 `이름 값` 꼴로 적는다. 멈춤 명령(0)만 거절하거나 무시하게 할 수 있다 */
function 가짜(처음 = 1, 멈춤막기: 'throw' | 'ignore' | null = null): { 길: Link; 명령: string[]; 배율: () => number } {
  const 명령: string[] = [];
  let 배율 = 처음;
  const 길 = (async (c: Command) => {
    const cmd = c as unknown as Record<string, unknown>;
    명령.push([cmd.cmd, cmd.scale].filter((x) => x !== undefined).join(' '));
    switch (cmd.cmd) {
      case 'ping': return { ok: true, app: 'g', version: '1' };
      case 'timescale-get': return { ok: true, timeScale: 배율 };
      case 'timescale-set':
        if (Number(cmd.scale) === 0 && 멈춤막기 === 'throw') throw new Error('멈춤 거절');
        if (!(Number(cmd.scale) === 0 && 멈춤막기 === 'ignore')) 배율 = Number(cmd.scale);
        return { ok: true };
      case 'get': return { ok: true, value: 1 };
      case 'logs': return { ok: true, last: 0, logs: [] };
      case 'errors': return { ok: true, last: 0, errors: [] };
      case 'events': return { ok: true, last: 0, events: [] };
      case 'screenshot': return { ok: true, jpg: Buffer.from('그림').toString('base64') };
      default: return { ok: true };
    }
  }) as unknown as Link;
  return { 길, 명령, 배율: () => 배율 };
}

type 드라이버 = { get(a: string, b: string): Promise<unknown>; setTimeScale(n: number): Promise<void> };
const 읽기만 = async (game: unknown) => (game as 드라이버).get('/P', 'x');

describe('멈춰 가며 하기', () => {
  it('멈춤이면 함수가 끝난 뒤 입력을 놓기 전에 0배로 멈추고 표시에 앞 값을 쓴다', async () => {
    const d = 새자료();
    const g = 가짜(1);
    const r = await 돌린다(g.길, 읽기만, {}, 5_000, undefined, { 멈춤: true, 자료: d });
    expect(g.배율()).toBe(0);
    expect(r.멈춘뒤배율).toBe(0);
    expect(r.배율).toBe(1);
    expect(g.명령.indexOf('timescale-set 0')).toBeGreaterThan(g.명령.indexOf('get'));
    expect(g.명령.indexOf('timescale-set 0')).toBeLessThan(g.명령.indexOf('input-reset'));
    expect(멈춤표시읽기(d)?.배율).toBe(1);
    expect(멈춤줄(r)).toEqual(['멈춤 확인 — 시간 배율 0. 다음에 부르면 풀고 잇는다(멈춘 동안에는 보기만 한다)']);
  });

  it('표시가 있고 0배이면 함수의 첫 명령 전에 풀고 표시를 지운다 — 멈춤을 안 줘도 그렇다', async () => {
    const d = 새자료();
    멈춤표시쓰기(d, 1);
    const g = 가짜(0);
    const r = await 돌린다(g.길, 읽기만, {}, 5_000, undefined, { 자료: d });
    expect(g.명령.indexOf('timescale-set 1')).toBeLessThan(g.명령.indexOf('get'));
    expect(r.배율).toBe(1);
    expect(g.배율()).toBe(1);
    expect(멈춤표시읽기(d)).toBeNull();
    expect(r.알림말).toEqual([]);
    expect(r.멈춘채).toBe(false);
  });

  it('표시가 있어도 0배가 아니면 표시만 지우고 배율은 안 건드린다', async () => {
    const d = 새자료();
    멈춤표시쓰기(d, 1);
    const g = 가짜(0.5);
    const r = await 돌린다(g.길, 읽기만, {}, 5_000, undefined, { 자료: d });
    expect(g.명령.filter((x) => x.startsWith('timescale-set'))).toEqual([]);
    expect(r.배율).toBe(0.5);
    expect(멈춤표시읽기(d)).toBeNull();
  });

  it('표시가 없으면 0배여도 안 푼다 — 게임이 스스로 멈춘 화면이고 알림 한 줄만 싣는다', async () => {
    const d = 새자료();
    const g = 가짜(0);
    const r = await 돌린다(g.길, 읽기만, {}, 5_000, undefined, { 자료: d });
    expect(g.명령.filter((x) => x.startsWith('timescale-set'))).toEqual([]);
    expect(r.배율).toBe(0);
    expect(r.알림말).toHaveLength(1);
    expect(r.알림말[0]).toContain('풀지 않았다');
    const 덧없이 = 가짜(0);
    expect((await 돌린다(덧없이.길, 읽기만, {}, 5_000)).알림말).toHaveLength(1);
  });

  it('학습 세션에서 시간 한도로 끝나면 --freeze 가 없어도 멈춘 채 돌려주고, 학습 세션이 아니거나 한도 전에 끝나면 안 멈춘다', async () => {
    const 오래 = (): Promise<void> => new Promise((끝) => setTimeout(끝, 400));
    const 학습 = 새자료();
    writeFileSync(join(학습, 'game-learning.now'), '1');
    const g = 가짜(1);
    const r = await 돌린다(g.길, 오래, {}, 100, undefined, { 자료: 학습 });
    expect(r.오류).toContain('제한 시간');
    expect(g.배율()).toBe(0);
    expect(멈춤표시읽기(학습)?.배율).toBe(1);
    const 끝남 = 가짜(1);
    await 돌린다(끝남.길, 읽기만, {}, 5_000, undefined, { 자료: 학습 });
    expect(끝남.배율()).toBe(1);
    const 시험 = 새자료();
    const 시험판 = 가짜(1);
    await 돌린다(시험판.길, 오래, {}, 100, undefined, { 자료: 시험 });
    expect(시험판.배율()).toBe(1);
  });

  it('학습 세션에서 계획으로 부른 판은 함수가 스스로 끝나도 멈춘 채 돌려준다 — 회고를 적는 동안 판이 혼자 흘러 졌다(16098 첫 맵 5/6 세계수 49)', async () => {
    const 학습 = 새자료();
    writeFileSync(join(학습, 'game-learning.now'), '1');
    const g = 가짜(1);
    const r = await 돌린다(g.길, 읽기만, {}, 5_000, undefined, { 자료: 학습, 볼: { 계획: 'trial:가', 볼값: [], 기대: [] } });
    expect(r.오류).toBeUndefined();
    expect(g.배율()).toBe(0);
    expect(멈춤표시읽기(학습)?.배율).toBe(1);
  });

  it('표시의 풀 값이 0 이면 풀 것이 없다 — 표시를 지우고 판이 안 흐른다고 알린다', async () => {
    const d = 새자료();
    멈춤표시쓰기(d, 0);
    const g = 가짜(0);
    const r = await 돌린다(g.길, 읽기만, {}, 5_000, undefined, { 자료: d });
    expect(g.명령.filter((x) => x.startsWith('timescale-set'))).toEqual([]);
    expect(r.배율).toBe(0);
    expect(r.알림말).toEqual([expect.stringContaining('판이 안 흐른다')]);
    expect(멈춤표시읽기(d)).toBeNull();
  });

  it('이미 0배인 게임을 멈추라 하면 표시를 안 쓰고 알림만 싣는다', async () => {
    const d = 새자료();
    const g = 가짜(0);
    const r = await 돌린다(g.길, 읽기만, {}, 5_000, undefined, { 멈춤: true, 자료: d });
    expect(멈춤표시읽기(d)).toBeNull();
    expect(r.멈춘뒤배율).toBeUndefined();
    expect(r.알림말.some((x) => x.includes('이미 멈춰 있다'))).toBe(true);
  });

  it('함수가 배율을 바꿨으면 표시에 부르기 앞 값을 쓰고, 멈춤이 아니면 앞 값으로 되돌린다', async () => {
    const d = 새자료();
    const 바꿈 = async (game: unknown) => (game as 드라이버).setTimeScale(0.25);
    const g = 가짜(1);
    const r = await 돌린다(g.길, 바꿈, {}, 5_000, undefined, { 멈춤: true, 자료: d });
    expect(멈춤표시읽기(d)?.배율).toBe(1);
    expect(g.배율()).toBe(0);
    expect(r.배율바꿈).toBe(true);
    const 되돌림 = 가짜(1);
    await 돌린다(되돌림.길, 바꿈, {}, 5_000, undefined, { 자료: 새자료() });
    expect(되돌림.배율()).toBe(1);
  });

  it('멈춤 명령이 던져도 입력은 놓고 멈추지 못했다고 알린다', async () => {
    const d = 새자료();
    const g = 가짜(1, 'throw');
    const r = await 돌린다(g.길, 읽기만, {}, 5_000, undefined, { 멈춤: true, 자료: d });
    expect(g.명령).toContain('input-reset');
    expect(r.멈춘뒤배율).toBe(1);
    expect(r.못한것.some((x) => x.includes('시간 배율 멈추기: 멈춤 거절'))).toBe(true);
    expect(멈춤줄(r)[0]).toBe('멈추지 못했다 — 시간 배율 1');
    expect(멈춤표시읽기(d)).toBeNull();
  });

  it('되읽은 배율이 0 이 아니면 멈추지 못했다', async () => {
    const g = 가짜(1, 'ignore');
    const r = await 돌린다(g.길, 읽기만, {}, 5_000, undefined, { 멈춤: true, 자료: 새자료() });
    expect(r.멈춘뒤배율).toBe(1);
    expect(멈춤줄(r)).toEqual(['멈추지 못했다 — 시간 배율 1']);
  });

  it('표시가 있는데 풀기가 던지면 멈춘채로 알린다', async () => {
    const d = 새자료();
    멈춤표시쓰기(d, 1);
    const g = 가짜(0);
    const 막힘: Link = async (c) => {
      if ((c as unknown as { cmd: string }).cmd === 'timescale-set') throw new Error('풀기 거절');
      return g.길(c);
    };
    const r = await 돌린다(막힘, 읽기만, {}, 5_000, undefined, { 자료: d });
    expect(r.멈춘채).toBe(true);
    expect(r.배율).toBe(0);
    expect(멈춤표시읽기(d)).not.toBeNull();
    // 안 흐르는 판에서 한도까지 돌지 않는다 — 함수를 부르지 않고 까닭을 오류로 낸다
    expect(r.오류).toContain('함수를 부르지 않았다');
    expect(g.명령).not.toContain('get');
  });

  it('멈추라 했는데 못 멈췄으면 함수가 바꾼 배율을 부르기 앞 값으로 되돌린다 — 바뀐 속도로 계속 흐르지 않게', async () => {
    const 빨리 = async (game: unknown) => (game as 드라이버).setTimeScale(3);
    const g = 가짜(1, 'ignore');
    const r = await 돌린다(g.길, 빨리, {}, 5_000, undefined, { 멈춤: true, 자료: 새자료() });
    expect(r.멈춘뒤배율).toBe(3);
    expect(g.배율()).toBe(1);
  });

  it('함수가 스스로 0배로 만들고 끝나면 우리가 멈춘 것처럼 표시를 남긴다 — 다음에 부르면 풀린다', async () => {
    const d = 새자료();
    const 스스로 = async (game: unknown) => (game as 드라이버).setTimeScale(0);
    const g = 가짜(1);
    const r = await 돌린다(g.길, 스스로, {}, 5_000, undefined, { 멈춤: true, 자료: d });
    expect(r.멈춘뒤배율).toBe(0);
    expect(멈춤표시읽기(d)?.배율).toBe(1);
    expect(g.배율()).toBe(0);
    const 다음 = await 돌린다(g.길, 읽기만, {}, 5_000, undefined, { 자료: d });
    expect(다음.배율).toBe(1);
    expect(g.배율()).toBe(1);
  });

  it('조작 도우미 --freeze — 출력에 멈춤 확인 한 줄, 다음에 부르면 풀고 잇는다', async () => {
    const d = 새자료();
    const t = 새자료();
    mkdirSync(join(t, 'tests', 'g', 'helpers'), { recursive: true });
    mkdirSync(join(t, '.control-cli'));
    writeFileSync(join(t, '.control-cli', 'held'), 'pc-pc1\n');
    writeFileSync(join(t, 'tests', 'g', 'helpers', 'play.helper.ts'), "export const 한번 = (game) => game.get('/P', 'x');\n");
    const g = 가짜(1);
    const 찍힘 = vi.spyOn(console, 'log').mockImplementation(() => {});
    const 환경 = { [게임자료환경]: d };
    expect(await 실행(['g', 'play', '한번', '--freeze', '--shots', '0'], t, 환경, g.길)).toBe(0);
    expect(찍힘.mock.calls.map((c) => String(c[0])).join('\n')).toContain('멈춤 확인 — 시간 배율 0. 다음에 부르면 풀고 잇는다');
    expect(g.배율()).toBe(0);
    expect(await 실행(['g', 'play', '한번', '--shots', '0'], t, 환경, g.길)).toBe(0);
    expect(g.배율()).toBe(1);
    expect(멈춤표시읽기(d)).toBeNull();
  });
});
