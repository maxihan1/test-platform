// 데이터 묶음 칸 읽기 · 값 파일 검사 — game-types.txt 표 읽기 · 점 경로로 읽기(두 단계 · 목록은 이름만) · 값 파일은 안 덮음 (게임 정보 먼저 쌓기)
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Game } from 'control-cli';
import { afterEach, describe, expect, it } from 'vitest';

import { 값파일이름, 값파일있나, 값파일쓰기, 묶음읽기, 묶음타입, 종류, 종류표만들기, 종류표읽기 } from './authoring-game-bundles.js';

let 폴더들: string[] = [];
afterEach(() => {
  for (const d of 폴더들) rmSync(d, { recursive: true, force: true });
  폴더들 = [];
});
const 새폴더 = (): string => {
  const d = mkdtempSync(join(tmpdir(), 'game-bundles-'));
  폴더들.push(d);
  return d;
};

const 표 = 종류표만들기(
  [
    'MonsterTypeData MaxHP:int Damage:float ItemDropData:PPtr<$ItemDropData> Sprite:PPtr<$Sprite> Waves:vector',
    'ItemDropData Weight:float Next:PPtr<$ItemDropData2>',
    'ItemDropData2 Deep:int',
    '',
  ].join('\n'),
);

describe('종류표', () => {
  it('한 줄이 한 타입이고 칸 이름과 칸 타입을 나눠 읽는다', () => {
    expect(표.get('MonsterTypeData')).toEqual([
      { 칸: 'MaxHP', 타입: 'int' },
      { 칸: 'Damage', 타입: 'float' },
      { 칸: 'ItemDropData', 타입: 'PPtr<$ItemDropData>' },
      { 칸: 'Sprite', 타입: 'PPtr<$Sprite>' },
      { 칸: 'Waves', 타입: 'vector' },
    ]);
    expect(표.size).toBe(3);
  });

  it('자료 폴더에 파일이 없으면 빈 표', () => {
    expect(종류표읽기(undefined).size).toBe(0);
    expect(종류표읽기(새폴더()).size).toBe(0);
    const d = 새폴더();
    writeFileSync(join(d, 'game-types.txt'), 'A x:int\n');
    expect(종류표읽기(d).get('A')).toEqual([{ 칸: 'x', 타입: 'int' }]);
  });

  it('묶음 타입은 선언 타입이 표에 있으면 그것, 아니면 값 글의 타입', () => {
    expect(묶음타입('MonsterTypeData', null, 표)).toBe('MonsterTypeData');
    expect(묶음타입('Object', 'a (Game.Configuration.MonsterTypeData)', 표)).toBe('MonsterTypeData');
    expect(묶음타입('Object', 'a (Game.Other)', 표)).toBeNull();
    expect(묶음타입('Int32', 3, 표)).toBeNull();
  });
});

describe('묶음읽기', () => {
  const 게임 = (값: Record<string, unknown>, 못읽는 = ''): { game: Pick<Game, 'get'>; 부름: string[] } => {
    const 부름: string[] = [];
    return {
      부름,
      game: {
        get: async (_주소: string, 칸: string) => {
          부름.push(칸);
          if (칸 === 못읽는) throw new Error('없다');
          return 값[칸];
        },
      } as unknown as Pick<Game, 'get'>,
    };
  };

  it('칸 이름으로 점 경로를 읽고, 하위 묶음은 한 단계 더 따라가고, 목록은 이름만, 엔진 자산 칸은 건너뛴다', async () => {
    const g = 게임({ 'MonsterAI.TypeData.MaxHP': 30, 'MonsterAI.TypeData.Damage': 4, 'MonsterAI.TypeData.ItemDropData.Weight': 0.5 });
    const r = await 묶음읽기(g.game, '//*[@id=7]', 'MonsterAI.TypeData', 'MonsterTypeData', 표);
    expect(g.부름).toEqual(['MonsterAI.TypeData.MaxHP', 'MonsterAI.TypeData.Damage', 'MonsterAI.TypeData.ItemDropData.Weight']);
    expect(Object.fromEntries(r.값)).toEqual({ 'MonsterAI.TypeData.MaxHP': 30, 'MonsterAI.TypeData.Damage': 4, 'MonsterAI.TypeData.ItemDropData.Weight': 0.5 });
    expect(r.목록칸).toEqual(['MonsterAI.TypeData.Waves']);
    expect(r.못읽음).toEqual([]);
  });

  it('못 읽는 칸은 못읽음에 적고 나머지는 계속 읽는다', async () => {
    const g = 게임({ 'A.T.Damage': 4 }, 'A.T.MaxHP');
    const r = await 묶음읽기(g.game, '/a', 'A.T', 'MonsterTypeData', 표);
    expect(r.못읽음).toEqual(['A.T.MaxHP']);
    expect(r.값.get('A.T.Damage')).toBe(4);
  });

  it('그침(판이 끝나 세기를 그친 오류)은 칸마다 catch 가 삼키지 않고 그대로 던진다', async () => {
    class 그침 extends Error {}
    const 부름: string[] = [];
    const game = {
      get: async (_주소: string, 칸: string) => {
        부름.push(칸);
        if (칸 === 'A.T.Damage') throw new 그침();
        return 1;
      },
    } as unknown as Pick<Game, 'get'>;
    await expect(묶음읽기(game, '/a', 'A.T', 'MonsterTypeData', 표, 1, undefined, (e) => e instanceof 그침)).rejects.toBeInstanceOf(그침);
    expect(부름).toEqual(['A.T.MaxHP', 'A.T.Damage']);
  });

  it('표에 없는 타입은 아무것도 안 읽는다', async () => {
    const g = 게임({});
    expect((await 묶음읽기(g.game, '/a', 'A.T', '없는타입', 표)).값.size).toBe(0);
    expect(g.부름).toEqual([]);
  });
});

describe('값 파일', () => {
  it('종류 이름이 경로 글자를 품어도 폴더 밖으로 못 나간다', () => {
    expect(값파일이름('Ghost')).toBe('Ghost.json');
    expect(값파일이름('../../etc/x')).toBe('__.._etc_x.json');
    expect(값파일이름('..')).toBe('_.json');
    expect(값파일이름('')).toBe('_.json');
    expect(종류('/Enemies/Ghost(Clone)[3]')).toBe('Ghost');
  });

  it('처음 쓴 값이 정본이라 다시 써도 안 덮는다', () => {
    const d = 새폴더();
    const 기록 = { 종류: 'Ghost', 장면: 'Stage', 읽은때: '2026-11-27T00:00:00.000Z', 출처: '실행 중' as const, 칸: { a: 1 }, 목록칸: [] };
    expect(값파일있나(d, 'Ghost')).toBe(false);
    expect(값파일쓰기(d, 기록)).toBeNull();
    expect(값파일있나(d, 'Ghost')).toBe(true);
    expect(값파일쓰기(d, { ...기록, 칸: { a: 2 } })).toBeNull();
    expect(JSON.parse(readFileSync(join(d, 'game-props', 'Ghost.json'), 'utf8')).칸).toEqual({ a: 1 });
  });

  it('쓴 글에 가릴것을 적용하고, 못 쓰면 까닭을 돌려준다', () => {
    const d = 새폴더();
    expect(값파일쓰기(d, { 종류: 'X', 장면: null, 읽은때: 't', 출처: '실행 중', 칸: { pw: 'secret' }, 목록칸: [] }, (글) => 글.replace('secret', '***'))).toBeNull();
    expect(readFileSync(join(d, 'game-props', 'X.json'), 'utf8')).toContain('***');
    writeFileSync(join(d, 'file'), '');
    expect(값파일쓰기(join(d, 'file'), { 종류: 'X', 장면: null, 읽은때: 't', 출처: '실행 중', 칸: {}, 목록칸: [] })).not.toBeNull();
  });
});
