// 판 중간 멈춤 — 기대가 깨졌거나 처음 보는 오브젝트가 나오면 함수를 끊고 게임을 멈춘 채 그 순간을 남긴다 · 다음 계획이 이미 깨졌으면 안 받는다 (도메인/게임 §3.10 「판 중간 멈춤」)
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Command, Link } from 'control-cli';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { 기록남기기, 덧줄 } from './authoring-game-play-log.js';
import type { 나온것 } from './authoring-game-play-spawns.js';
import { 멈춤보기시작, 바뀐것 } from './authoring-game-play-stop.js';
import { 돌린다 } from './authoring-game-play.js';
import { type 값기록, 판기록들 } from './authoring-learn-check.js';
import { 배움막기 } from './authoring-learn-retro.js';

let 자리들: string[] = [];
afterEach(() => {
  for (const d of 자리들) rmSync(d, { recursive: true, force: true });
  자리들 = [];
  vi.useRealTimers();
});
const 폴더 = (): string => {
  const d = mkdtempSync(join(tmpdir(), 'play-stop-'));
  자리들.push(d);
  return d;
};
const 쉼 = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const 빈나온 = (x: Partial<나온것> = {}): 나온것 => ({ 간격ms: 5000, 처음: {}, 장면바뀜: [], 센때: [], 첫초: {}, 화면것: [], 지도에없음: [], 처음지도에없음: [], 펼침: [], 안펼침: [], ...x });
const 값들 = (세계수: number): 값기록 => ({ 계획: 'trial:첫 맵', 볼값: [], 간격ms: 2000, 때: [{ 초: 1, 값: { 세계수 } }], 어긋남: null, 화면다름: [] });
const 게임 = (): { logs: (n: number) => Promise<unknown>; screenshot: () => Promise<Buffer> } => ({
  logs: async (n: number) => ({ last: n + 1, logs: [{ seq: n + 1, occurredAt: 'PC 시계', type: 'Log', message: `악마 ${n + 1} 나옴`, stack: '' }] }),
  screenshot: async () => Buffer.from('사진'),
});

describe('판 중간 멈춤', () => {
  it('20초 앞과 견줘 수가 바뀐 종류만 싣는다', () => {
    const 나온 = 빈나온({ 처음: { Demon: 1, Tree: 2 }, 센때: [{ 초: 5, 수: {} }, { 초: 30, 수: { Demon: 4 } }, { 초: 40, 수: { Demon: 4, Meat: 2 } }] });
    expect(바뀐것(나온, 45)).toEqual({ Demon: [1, 4], Meat: [0, 2] });
    expect(바뀐것(null, 45)).toEqual({});
  });

  it('기대가 깨지면 다음 확인 때 한 번만 멈추고 그 순간 값 · 사진 · 모은 게임 로그를 남긴다', async () => {
    const 기 = 값들(40);
    const 멈춘: string[] = [];
    const 고리 = 멈춤보기시작(게임() as never, Date.now(), { 값: () => 기, 나온: () => null, 로그앞: 0 }, (왜) => 멈춘.push(왜), 10);
    await 쉼(35);
    expect(멈춘).toEqual([]);
    기.때.push({ 초: 30, 값: { 세계수: 28 } });
    기.어긋남 = { 초: 30, 값이름: '세계수', 값: 28, 기대: '세계수 >= 30' };
    await 쉼(40);
    expect(멈춘).toEqual(['기대 세계수 >= 30 가 30초에 깨짐(세계수 28)']);
    const r = await 고리.끝난다();
    expect(r.멈춤).toMatchObject({ 까닭: 멈춘[0], 값: { 세계수: 28 } });
    expect(r.멈춤!.로그.at(-1)).toMatch(/^0초 Log 악마 \d+ 나옴$/);
    expect(r.사진?.toString()).toBe('사진');
  });

  it('판 도중 처음 보는(지도에 없는) 오브젝트가 나오면 펼치기가 끝난 뒤 멈춘다', async () => {
    const 나온 = 빈나온();
    const 멈춘: string[] = [];
    const 고리 = 멈춤보기시작(게임() as never, Date.now(), { 값: () => 값들(50), 나온: () => 나온, 로그앞: null }, (왜) => 멈춘.push(왜), 10);
    await 쉼(25);
    나온.지도에없음.push('Ghost');
    await 쉼(30);
    expect(멈춘).toEqual([]);
    나온.펼침.push({ 종류: 'Ghost', 초: 1, 주소: '//*[@id=3]' });
    await 쉼(30);
    expect(멈춘).toEqual(['처음 보는 오브젝트 Ghost']);
    expect((await 고리.끝난다()).멈춤!.로그).toEqual([]);
  });

  it('조작 도우미 — 계획으로 도는 함수를 10초 확인에서 끊고 게임을 0배로 멈추고, 출력에 멈춤 보고를 찍는다', async () => {
    vi.useFakeTimers();
    const 자료 = 폴더();
    const 명령: string[] = [];
    let 배율 = 1;
    const 길 = (async (c: Command) => {
      const cmd = c as unknown as Record<string, unknown>;
      명령.push(String(cmd.cmd));
      if (cmd.cmd === 'get') return { ok: true, value: 20 };
      if (cmd.cmd === 'timescale') return { ok: true, scale: 배율 };
      if (cmd.cmd === 'timescale-set') return ((배율 = Number(cmd.scale)), { ok: true });
      if (cmd.cmd === 'logs') return { ok: true, last: 0, logs: [] };
      if (cmd.cmd === 'screenshot') return { ok: true, jpg: Buffer.from('사진').toString('base64') };
      return { ok: true };
    }) as unknown as Link;
    const 볼 = { 계획: 'trial:첫 맵', 볼값: [{ 이름: '세계수', 주소: '/Lumikantle', 칸: 'Lumikantle.HP' }], 기대: [{ 값: '세계수', 비교: '>=' as const, 기준: 30 }] };
    const 판 = 돌린다(길, () => new Promise(() => {}), {}, 300_000, undefined, { 자료, 볼 });
    let 끝 = false;
    void 판.finally(() => (끝 = true));
    for (let i = 0; i < 60 && !끝; i += 1) await vi.advanceTimersByTimeAsync(1_000);
    const r = await 판;
    expect(r.오류).toContain('판 중간 멈춤 — 기대 세계수 >= 30 가 0초에 깨짐(세계수 20)');
    expect(r.걸린ms).toBeLessThan(15_000);
    expect(배율).toBe(0);
    expect(r.멈춤).toMatchObject({ 값: { 세계수: 20 } });
    const 기록 = 기록남기기(자료, '지키기', [], r, [], new Date('2026-11-26T07:00:00.000Z'))!;
    expect(덧줄(r, 기록).join('\n')).toContain('판 중간 멈춤 10초 — 기대 세계수 >= 30');
    expect(덧줄(r, 기록).join('\n')).toContain('사진 20261126070000000-지키기-멈춤.jpg');
    expect(readFileSync(`${기록}-멈춤.jpg`, 'utf8')).toBe('사진');
    expect(판기록들(자료)[0]).toMatchObject({ 이름: '20261126070000000-지키기', 멈춤: { 값: { 세계수: 20 } } });
  });

  it('멈춘 판을 이을 새 계획의 기대가 멈춘 순간 값으로 이미 깨졌으면 안 받는다 — 게임이 그 멈춤에 멈춰 있을 때만', () => {
    const 자료 = 폴더();
    writeFileSync(join(자료, 'game-learning.now'), '1');
    const 계획 = (기준: number) => ({ kind: 'TRIAL', key: 'trial:둘째', name: 'ㄱ', line: '', learned: { text: 'ㄱ', belief: 'GUESS', data: { 볼값: [{ 이름: '세계수', 주소: 'HpText' }], 기대: [{ 값: '세계수', 비교: '>=', 기준 }], 목표: { 값: '세계수', 기준: 1 } } } });
    const 회고 = { kind: 'PLAY', key: 'play:20261126070000000-지키기', name: 'ㄱ', line: '', learned: { text: 'ㄱ', belief: 'SEEN', data: {} } };
    const 나아감 = { kind: 'GOAL', key: 'goal:나아감', name: 'ㄱ', line: '', learned: { text: 'ㄱ', belief: 'SEEN', data: { 주소: 'WaveText' } } };
    const 멈춘판 = [{ 이름: '20261126070000000-지키기', 값기록: 값들(28), 멈춤: { 초: 40, 값: { 세계수: 28 } } }];
    expect(배움막기(자료, 300, 'trial:둘째', [계획(30), 회고, 나아감] as never, 멈춘판)).toMatchObject({ 계획: 'trial:둘째' });
    writeFileSync(join(자료, 'game-freeze.json'), JSON.stringify({ 배율: 1, 때: new Date().toISOString() }));
    expect(배움막기(자료, 300, 'trial:둘째', [계획(30), 회고, 나아감] as never, 멈춘판)).toMatchObject({ 막음: expect.stringContaining('「세계수 >= 30」 가 멈춘 순간 값(세계수 28)으로 이미 깨졌다') });
    expect(배움막기(자료, 300, 'trial:둘째', [계획(20), 회고, 나아감] as never, 멈춘판)).toMatchObject({ 계획: 'trial:둘째' });
  });
});
