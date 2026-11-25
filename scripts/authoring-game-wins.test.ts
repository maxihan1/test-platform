// 10판 확인 검사 — 원래 속도로 다 이긴 작전만 · 졌으면 같은 작전을 다시 안 셈 · 나눠 불러 잇기 · 도우미를 고치면 처음부터 · 환경 탓은 안 셈 (도메인/게임 §3.10 「배운 것을 PRD · 테스트로」)
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Command, Link } from 'control-cli';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { 게임자료환경 } from './authoring-check-game.js';
import { 실행 } from './authoring-game-wins.js';
import { 작전지문, 이긴판읽기 } from './authoring-game-wins-log.js';

let 트리 = '';
let 자료 = '';
let 값들: unknown[] = [];
let 배율 = 1;
const 길 = (async (c: Command) => {
  const cmd = c as unknown as Record<string, unknown>;
  switch (cmd.cmd) {
    case 'ping': return { ok: true, app: 'g', version: '1' };
    case 'get': {
      const v = 값들.shift();
      if (v instanceof Error) throw v;
      return { ok: true, value: v ?? null };
    }
    case 'timescale-get': return { ok: true, timeScale: 배율 };
    case 'timescale-set': 배율 = Number(cmd.scale); return { ok: true };
    case 'logs': return { ok: true, last: 0, logs: [] };
    case 'errors': return { ok: true, last: 0, errors: [] };
    case 'events': return { ok: true, last: 0, events: [] };
    case 'screenshot': return { ok: true, jpg: Buffer.from('그림').toString('base64') };
    default: return { ok: true };
  }
}) as unknown as Link;

const 도우미 = `
import { 덧 } from './lib.helper.js';
export async function 한판(game) { return { 이김: (await game.get('/Game', 'Match.won')) === true, 덧 }; }
export async function 빈판() { return {}; }
export async function 느린판(game) { await game.setTimeScale(0.25); return { 이김: true }; }
`;
beforeEach(() => {
  트리 = mkdtempSync(join(tmpdir(), 'wins-'));
  자료 = join(트리, 'data');
  mkdirSync(join(트리, 'tests', 'g', 'helpers'), { recursive: true });
  mkdirSync(join(트리, '.control-cli'));
  mkdirSync(자료);
  writeFileSync(join(트리, 'tests', 'g', 'helpers', 'play.helper.ts'), 도우미);
  writeFileSync(join(트리, 'tests', 'g', 'helpers', 'lib.helper.ts'), 'export const 덧 = 1;\n');
  writeFileSync(join(트리, '.control-cli', 'held'), 'pc-pc1\n');
  값들 = [];
  배율 = 1;
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  vi.restoreAllMocks();
  rmSync(트리, { recursive: true, force: true });
});
const 부르기 = (함수 = '한판', 지금?: () => number, 인자 = '["쉬움"]') => 실행(['g', 'play', 함수, 인자, '--max', '5'], 트리, { [게임자료환경]: 자료 }, 길, 지금);
const 판 = (인자: unknown[] = ['쉬움']) => 이긴판읽기(자료, 트리, 'g', { 파일: 'play', 함수: '한판', 인자 });
const 찍힘 = () => [...vi.mocked(console.log).mock.calls, ...vi.mocked(console.error).mock.calls].flat().join('\n');

describe('10판 확인', () => {
  it('열 판을 다 이기면 0 — 판마다 한 줄과 기록을 남긴다', async () => {
    값들 = Array.from({ length: 10 }, () => true);
    expect(await 부르기()).toBe(0);
    expect(판()).toEqual({ 이김: 10, 짐: 0 });
    expect(찍힘()).toContain('10판째 이김');
    expect(readdirSync(join(자료, 'game-play')).filter((n) => n.endsWith('.json')).length).toBeGreaterThan(0);
    expect(await 부르기()).toBe(0);
  });

  it('한 판이라도 지면 1 이고, 같은 작전은 다시 불러도 안 돌린다 — 이길 때까지 돌리면 확인이 아니다', async () => {
    값들 = [true, true, false];
    expect(await 부르기()).toBe(1);
    expect(판()).toEqual({ 이김: 2, 짐: 1 });
    값들 = Array.from({ length: 10 }, () => true);
    expect(await 부르기()).toBe(1);
    expect(값들).toHaveLength(10);
    expect(찍힘()).toContain('이미 졌다');
  });

  it('시작 조건(인자)이 다르면 따로 세고, 도우미나 그것이 가져오는 파일을 고치면 처음부터 센다', async () => {
    값들 = [false];
    expect(await 부르기()).toBe(1);
    expect(판(['더 쉬움'])).toEqual({ 이김: 0, 짐: 0 });
    const 앞 = 작전지문(트리, 'g', 'play');
    writeFileSync(join(트리, 'tests', 'g', 'helpers', 'lib.helper.ts'), 'export const 덧 = 2;\n');
    expect(작전지문(트리, 'g', 'play')).not.toBe(앞);
    expect(판()).toEqual({ 이김: 0, 짐: 0 });
    writeFileSync(join(자료, 'game-build.txt'), '60');
    expect(판()).toEqual({ 이김: 0, 짐: 0 });
  });

  it('한 번 부름 안에 다음 판이 안 들어가면 3 — 다시 부르면 이긴 판을 잇는다', async () => {
    let 때 = 0;
    값들 = Array.from({ length: 10 }, () => true);
    expect(await 부르기('한판', () => (때 += 250_000))).toBe(3);
    expect(판().이김).toBe(2);
    expect(await 부르기()).toBe(0);
    expect(판()).toEqual({ 이김: 10, 짐: 0 });
  });

  it('팜이 거절하거나 원래 속도가 아니거나 이김을 안 돌려준 판은 세지 않고 2', async () => {
    값들 = [true, new Error('게임 명령에 HTTP 409 로 답했습니다: 잡은 폰이 아닙니다')];
    expect(await 부르기()).toBe(2);
    expect(판()).toEqual({ 이김: 1, 짐: 0 });
    expect(await 부르기('빈판')).toBe(2);
    expect(await 부르기('느린판')).toBe(2);
    배율 = 0.25;
    값들 = [true];
    expect(await 부르기()).toBe(2);
    expect(찍힘()).toContain('원래 속도가 아니다');
    expect(판()).toEqual({ 이김: 1, 짐: 0 });
  });

  it('함수가 던지거나 한도를 넘기면 이긴 판이 아니다', async () => {
    값들 = [true, new Error('적을 못 찾음')];
    expect(await 부르기()).toBe(1);
    expect(판()).toEqual({ 이김: 1, 짐: 1 });
  });
});
