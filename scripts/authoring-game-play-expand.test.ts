// 판 도중 새로 나온 종류 펼치기 — 이미 값 파일이 있으면 건너뛰되 치트로 본 값은 보통 판에서 다시 읽어 덮는다 (게임 정보 먼저 쌓기)
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Found, Game } from 'control-cli';
import { afterEach, describe, expect, it } from 'vitest';

import { 값파일쓰기 } from './authoring-game-bundles.js';
import { 새종류펼치기 } from './authoring-game-play-expand.js';
import type { 나온것 } from './authoring-game-play-spawns.js';

let 자리들: string[] = [];
afterEach(() => {
  for (const d of 자리들) rmSync(d, { recursive: true, force: true });
  자리들 = [];
});

const 게임 = (): Game =>
  ({
    components: async () => [{ name: 'MonsterHP', type: 'Game.MonsterHP' }],
    members: async () => ({ fields: [{ name: 'MaxHP', type: 'Int32', value: 40 }], properties: [], methods: [] }),
    get: async () => 40,
  }) as unknown as Game;
const 새나온 = (): 나온것 => ({ 간격ms: 1000, 처음: {}, 장면바뀜: [], 센때: [], 첫초: {}, 화면것: [], 지도에없음: [], 처음지도에없음: [], 펼침: [], 안펼침: [] });
const 찾음 = { path: '/Pool/Boss(Clone)', id: 7 } as Found;
const 기록 = { 종류: 'Boss', 장면: 'Stage', 읽은때: 't', 출처: '실행 중' as const, 칸: { 'MonsterHP.MaxHP': 1 }, 목록칸: [] };

describe('새종류펼치기 · 치트 값 다시 읽기', () => {
  const 읽음 = (자료: string): { 칸: Record<string, number>; 치트?: true } => JSON.parse(readFileSync(join(자료, 'game-props', 'Boss.json'), 'utf8'));
  const 펼친다 = async (자료: string, 덧?: { 치트: true; call: string[] }): Promise<나온것> => {
    const 나온 = 새나온();
    await 새종류펼치기({ 나온, 종류: 'Boss', 찾음, 초: 1, 펼칠까: true, 게임: 게임(), 장면: 'Stage', 자료, ...(덧 === undefined ? {} : { 덧 }), 그침인가: () => false });
    return 나온;
  };
  const 새자료 = (): string => {
    const d = mkdtempSync(join(tmpdir(), 'game-expand-'));
    자리들.push(d);
    return d;
  };

  it('치트로 본 값 파일이 있고 지금이 보통 판이면 다시 읽어 치트 표시 없는 값으로 덮는다', async () => {
    const 자료 = 새자료();
    값파일쓰기(자료, { ...기록, 치트: true, call: ['a|b'] });
    const 나온 = await 펼친다(자료);
    expect(나온.펼침).toHaveLength(1);
    expect(읽음(자료).칸['MonsterHP.MaxHP']).toBe(40);
    expect(읽음(자료).치트).toBeUndefined();
  });

  it('정보 모으기 안(치트)이거나 보통 값이 이미 있으면 다시 안 읽는다', async () => {
    const 자료 = 새자료();
    값파일쓰기(자료, { ...기록, 치트: true, call: ['a|b'] });
    const 치트판 = await 펼친다(자료, { 치트: true, call: ['a|b'] });
    expect(치트판.이미펼침).toEqual(['Boss']);
    값파일쓰기(자료, 기록);
    const 보통 = await 펼친다(자료);
    expect(보통.이미펼침).toEqual(['Boss']);
    expect(읽음(자료).칸['MonsterHP.MaxHP']).toBe(1);
  });
});
