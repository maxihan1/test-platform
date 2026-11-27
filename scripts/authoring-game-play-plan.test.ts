// 조작 도우미를 계획으로 부르기 — 학습 세션의 --plan · 2초 볼값 기록 · 처음 어긋난 순간 사진 · 끝 화면 글자 · 회고 없으면 다음을 막기 (도메인/게임 §3.10 「회고」 · 「지도 검증」)
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Command, Link } from 'control-cli';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { 게임자료환경 } from './authoring-check-game.js';
import { 실행 } from './authoring-game-play.js';

let t = '';
const 자료 = () => join(t, 'data');
const 배움 = (data: object) => JSON.stringify({ text: 'ㄱ', belief: 'GUESS', data });
const 지도 = [
  '## 시험 (TRIAL) — 1개',
  `- trial:첫 맵 · 첫 맵 · 배움 ${배움({ 볼값: [{ 이름: '세계수', 주소: '/Lumikantle', 칸: 'Lumikantle.HP' }], 기대: [{ 값: '세계수', 비교: '>=', 기준: 50 }], 목표: { 값: '세계수', 기준: 50 } })}`,
  '## 목표 (GOAL) — 1개',
  `- goal:나아감 · 깬 맵 수 · 배움 ${배움({ 주소: 'ClearCount' })}`,
].join('\n');

beforeEach(() => {
  t = mkdtempSync(join(tmpdir(), 'game-plan-'));
  mkdirSync(join(t, 'tests', 'g', 'helpers'), { recursive: true });
  mkdirSync(join(t, '.control-cli'));
  mkdirSync(자료());
  writeFileSync(join(t, 'tests', 'g', 'helpers', 'play.helper.ts'), 'export const 판 = () => new Promise((끝) => setTimeout(() => 끝({ 이김: false }), 2_100));\n');
  writeFileSync(join(t, '.control-cli', 'held'), 'pc-pc1\n');
  writeFileSync(join(자료(), 'game-map.txt'), 지도);
  writeFileSync(join(자료(), 'game-learning.now'), '1');
});
afterEach(() => {
  vi.restoreAllMocks();
  rmSync(t, { recursive: true, force: true });
});

// 첫 읽기는 앞 판 끝 화면일 수 있어 기대를 안 본다 — 두 번째 읽기(2초)에 바뀐 값으로 어긋난다
let 세계수: number[] = [];
const 길 = (async (c: Command) => {
  const cmd = c as unknown as Record<string, unknown>;
  switch (cmd.cmd) {
    case 'ping': return { ok: true, app: 'g', version: '1' };
    case 'get': return { ok: true, value: 세계수.shift() ?? 42 };
    case 'find': return { ok: true, found: true, path: cmd.target, text: '깬 맵 0' };
    case 'tree': return { ok: true, scene: 'Main', screen: [100, 100], tree: [{ name: 'Canvas', children: [{ name: 'MyBestValue', text: '--:--.--' }] }] };
    case 'timescale-get': return { ok: true, timeScale: 1 };
    case 'logs': return { ok: true, last: 0, logs: [] };
    case 'errors': return { ok: true, last: 0, errors: [] };
    case 'events': return { ok: true, last: 0, events: [] };
    case 'screenshot': return { ok: true, jpg: Buffer.from('그림').toString('base64') };
    default: return { ok: true };
  }
}) as unknown as Link;

const 부르기 = (...덧: string[]) => 실행(['g', 'play', '판', '--shots', '0', ...덧], t, { [게임자료환경]: 자료() }, 길);
const 찍힘 = () => [...vi.mocked(console.log).mock.calls, ...vi.mocked(console.error).mock.calls].flat().join('\n');

it('계획으로 해 보면 볼값 · 처음 어긋난 순간 사진 · 끝 화면 글자를 남기고, 회고 줄을 적기 전에는 다음을 안 돌린다', async () => {
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  expect(await 부르기('--max', '61')).toBe(2);
  expect(찍힘()).toContain('--plan <계획(TRIAL) 줄 열쇠>');
  세계수 = [60];
  expect(await 부르기('--max', '61', '--plan', 'trial:첫 맵')).toBe(0);
  const 파일들 = readdirSync(join(자료(), 'game-play'));
  const 이름 = 파일들.find((x) => x.endsWith('-판.json'))!.slice(0, -5);
  expect(파일들).toContain(`${이름}-어긋남.jpg`);
  const 몸 = JSON.parse(readFileSync(join(자료(), 'game-play', `${이름}.json`), 'utf8')) as Record<string, unknown>;
  expect(몸).toMatchObject({
    값기록: { 계획: 'trial:첫 맵', 때: [{ 값: { 세계수: 60, 나아감: 0 } }, { 값: { 세계수: 42, 나아감: 0 } }], 어긋남: { 값이름: '세계수', 값: 42, 기대: '세계수 >= 50', 사진: `${이름}-어긋남.jpg` } },
    끝글: [{ 주소: 'MyBestValue', 글: '--:--.--' }],
  });
  expect(찍힘()).toContain(`회고 줄 play:${이름} 을 적어야 다음 해 보기가 돈다`);
  // 짧은 재기도 앞 회고가 없으면 막힌다
  expect(await 부르기('--max', '30')).toBe(2);
  expect(찍힘()).toContain(`회고 줄(play:${이름})이 지도에 없다`);
  writeFileSync(join(자료(), 'game-learned.json'), JSON.stringify({ elements: [{ kind: 'PLAY', key: `play:${이름}`, name: '회고', learned: { text: 'ㄱ', belief: 'SEEN', data: {} } }] }));
  expect(await 부르기('--max', '30')).toBe(0);
  // --max 를 안 주면 학습 세션의 계획 없는 부르기는 60초짜리 짧은 재기다(기본 90초에 안 막힌다)
  expect(await 부르기()).toBe(0);
  // 학습 세션이 아니면(케이스 · 시험) 막지 않고 값도 안 읽는다
  rmSync(join(자료(), 'game-learning.now'));
  expect(await 부르기('--max', '61', '--plan', 'trial:첫 맵')).toBe(0);
  expect(existsSync(join(자료(), 'game-learn-grow.json'))).toBe(true);
});
