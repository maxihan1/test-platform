// 오브젝트 펼치기 — 값 · 묶음 · 목록 · 빈 칸 · 함수로 가르기, 네트워크 틀 거르기, 네트워크 값 읽기 (도메인/게임 §3.10 「오브젝트 펼치기」)
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Command, Game, Link } from 'control-cli';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type 펼친것, 더읽을것, 펼쳐남기기, 펼쳐읽기, 펼친글, 실행 } from './authoring-game-props.js';
import { 종류표만들기 } from './authoring-game-bundles.js';

let 자리들: string[] = [];
afterEach(() => {
  for (const d of 자리들) rmSync(d, { recursive: true, force: true });
  자리들 = [];
  vi.restoreAllMocks();
});

const 틀 = { fields: [{ name: 'm_NetworkManager', type: 'NetworkManager', value: 'NetworkManager (Unity.Netcode.NetworkManager)' }], properties: [{ name: 'IsOwner', type: 'Boolean', value: true }, { name: 'RpcTarget', type: 'RpcTarget', value: 'Unity.Netcode.RpcTarget' }], methods: [...Array.from({ length: 15 }, (_, i) => ({ name: `OnNetwork${i}`, args: [] })), { name: '__initializeRpcs', args: [] }] };
const 만들기 = (name: string, x: Partial<펼친것>): 펼친것 => ({ name, type: `Game.${name}`, fields: [...틀.fields, ...(x.fields ?? [])], properties: [...틀.properties, ...(x.properties ?? [])], methods: [...틀.methods, ...(x.methods ?? [])] });
const 악마 = [
  만들기('MonsterAI', {
    fields: [
      { name: 'TypeData', type: 'MonsterTypeData', value: 'GhostData_1 (Game.Configuration.MonsterTypeData)' },
      { name: 'DeathSpawns', type: 'GameObject[]', value: 'UnityEngine.GameObject[]' },
      { name: 'CurTarget', type: 'GameObject', value: null },
      { name: 'Poison', type: 'PoisonStacks', value: 'Game.PoisonStacks' },
      { name: 'Self', type: 'MonsterHP', value: 'Ghost(Clone) (Game.MonsterHP)' },
      { name: 'OnDie', type: 'Action`1', value: null },
      { name: 'State', type: 'ActionState', value: 'TODESTINATION' },
      { name: 'QuestMarker', type: 'Int32', value: 3 },
      { name: 'Hit', type: 'DamageHandler', value: 'Hit (Game.DamageHandler)' },
      { name: 'm_Load', type: 'ProfilerMarker', value: 'Unity.Profiling.ProfilerMarker' },
      { name: 'Label', type: 'String', value: '[Ghost] a.b' },
      { name: 'Rate', type: 'Single', value: 0.8, static: true },
    ],
    properties: [{ name: 'IsStunned', type: 'Boolean', value: false }],
    methods: [{ name: 'GetStun', args: ['Single'] }],
  }),
  만들기('MonsterHP', { fields: [{ name: 'HP', type: 'NetworkVariable`1', value: 'Unity.Netcode.NetworkVariable`1[System.Int32]' }, { name: 'MaxHP', type: 'Int32', value: 20 }] }),
  만들기('ServerCharacter', {}),
];

describe('펼친글', () => {
  it('값 · 묶음 · 목록 · 빈 칸 · 함수로 가르고 여러 컴포넌트가 물려받은 틀은 뺀다', () => {
    const 글 = 펼친글('/Pool/Ghost(Clone)[0]', 'Ghost(Clone)', 악마, ['Transform', 'Rigidbody'], new Map([['MonsterHP.HP.Value', 20]]));
    expect(글.slice(0, -1)).toEqual([
      '# /Pool/Ghost(Clone)[0]',
      '엔진 부품: Transform · Rigidbody',
      '■ MonsterAI',
      '  값 State=TODESTINATION · QuestMarker=3 · Label="[Ghost] a.b" · Rate(static)=0.8 · IsStunned=false',
      '  묶음 TypeData → GhostData_1 (MonsterTypeData) · Poison → (PoisonStacks) · Hit → Hit (DamageHandler)',
      '  목록 DeathSpawns',
      '  비어 있음 CurTarget',
      '  함수 GetStun(Single)',
      '■ MonsterHP',
      '  값 HP.Value=20 · MaxHP=20',
    ]);
    expect(글.at(-1)).toContain('static-get');
  });

  it('이름이 같은 값 칸은 컴포넌트가 여럿이어도 거르지 않고, 같은 컴포넌트가 여럿이면 한 번만 읽고 수를 단다', () => {
    const 칸 = { fields: [{ name: 'Damage', type: 'Int32', value: 5 }], properties: [], methods: [] };
    const 글 = 펼친글('/a', 'a', [{ name: 'A', type: 'G.A', ...칸 }, { name: 'B', type: 'G.B', ...칸 }, { name: 'Slot', type: 'G.Slot', ...칸, 수: 3 }], [], new Map());
    expect(글.slice(0, -1)).toEqual(['# /a', '■ A', '  값 Damage=5', '■ B', '  값 Damage=5', '■ Slot ×3 — 첫째만 읽힌다', '  값 Damage=5']);
  });

  it('네트워크 값은 .Value 로 더 읽고, 못 읽으면 이름만 남긴다', () => {
    expect(더읽을것(악마)).toEqual(['MonsterHP.HP.Value']);
    expect(펼친글('/a', 'a', 악마, [], new Map()).join('\n')).toContain('묶음 HP');
  });
});

describe('펼쳐읽기 · 묶음 칸', () => {
  const 표 = 종류표만들기('MonsterTypeData MaxHP:int Damage:float\n');
  const game = (읽음: string[]): Game =>
    ({
      components: async () => [{ name: 'MonsterAI', type: 'Game.MonsterAI' }],
      members: async () => ({ fields: [{ name: 'TypeData', type: 'MonsterTypeData', value: 'GhostData_1 (Game.Configuration.MonsterTypeData)' }, { name: 'Self', type: 'MonsterAI', value: 'Ghost(Clone) (Game.MonsterAI)' }, { name: 'Speed', type: 'Single', value: 3 }], properties: [], methods: [] }),
      get: async (_주소: string, 칸: string) => (읽음.push(칸), 칸.endsWith('MaxHP') ? 30 : 4),
    }) as unknown as Game;

  it('표에 있는 묶음 칸은 칸 이름으로 읽어 글에 `칸=값` 으로 넣고, 자기 컴포넌트를 가리키는 칸은 안 읽는다', async () => {
    const 읽음: string[] = [];
    const 펼침 = await 펼쳐읽기(game(읽음), '//*[@id=7]', 'Ghost(Clone)', 표);
    expect(읽음).toEqual(['MonsterAI.TypeData.MaxHP', 'MonsterAI.TypeData.Damage']);
    expect(펼침.글.join('\n')).toContain('TypeData.MaxHP=30 · TypeData.Damage=4');
    expect(펼침.값).toMatchObject({ 'MonsterAI.Speed': 3, 'MonsterAI.TypeData.MaxHP': 30, 'MonsterAI.TypeData.Damage': 4 });
  });

  it('표가 없으면 묶음 칸은 이름만 보이고 get 을 더 부르지 않는다', async () => {
    const 읽음: string[] = [];
    const 펼침 = await 펼쳐읽기(game(읽음), '//*[@id=7]', 'Ghost(Clone)');
    expect(읽음).toEqual([]);
    expect(펼침.글.join('\n')).toContain('묶음 TypeData → GhostData_1 (MonsterTypeData)');
  });
});

describe('펼쳐남기기 · 그침', () => {
  class 그침 extends Error {}
  const 게임 = (): Game =>
    ({
      components: async () => [{ name: 'MonsterHP', type: 'Game.MonsterHP' }],
      members: async () => ({ fields: [{ name: 'HP', type: 'NetworkVariable`1', value: 'Unity.Netcode.NetworkVariable`1[System.Int32]' }, { name: 'MaxHP', type: 'Int32', value: 20 }], properties: [], methods: [] }),
      get: async () => {
        throw new 그침();
      },
    }) as unknown as Game;

  it('네트워크 값을 읽다 그침이 나면 반쯤 읽은 값 파일을 쓰지 않고 그대로 던진다', async () => {
    const 자료 = mkdtempSync(join(tmpdir(), 'game-props-stop-'));
    자리들.push(자료);
    await expect(펼쳐남기기(게임(), '/a', 'Ghost', { 종류: 'Ghost', 장면: null, 자료, 그침인가: (e) => e instanceof 그침 })).rejects.toBeInstanceOf(그침);
    expect(existsSync(join(자료, 'game-props'))).toBe(false);
  });

  it('그침이 아닌 읽기 실패는 이름만 남기고 값 파일은 쓴다', async () => {
    const 자료 = mkdtempSync(join(tmpdir(), 'game-props-stop-'));
    자리들.push(자료);
    await 펼쳐남기기(게임(), '/a', 'Ghost', { 종류: 'Ghost', 장면: null, 자료, 그침인가: () => false });
    expect(existsSync(join(자료, 'game-props', 'Ghost.json'))).toBe(true);
  });
});

describe('실행', () => {
  const 트리 = (잡음 = true): string => {
    const t = mkdtempSync(join(tmpdir(), 'game-props-'));
    자리들.push(t);
    mkdirSync(join(t, '.control-cli'));
    if (잡음) writeFileSync(join(t, '.control-cli', 'held'), 'pc-pc1\n');
    return t;
  };
  const 가짜 = (명령: Record<string, unknown>[]): Link =>
    (async (c: Command) => {
      const cmd = c as unknown as Record<string, unknown>;
      명령.push(cmd);
      if (cmd.cmd === 'components') return { ok: true, components: [{ name: 'Transform', type: 'UnityEngine.Transform' }, { name: 'MonsterHP', type: 'Game.MonsterHP' }] };
      if (cmd.cmd === 'members') return { ok: true, fields: 악마[1]!.fields, properties: [], methods: [] };
      if (cmd.cmd === 'get') return { ok: true, value: 7 };
      return { ok: true };
    }) as unknown as Link;

  it('게임 컴포넌트만 펼치고 읽기만 한다', async () => {
    const 명령: Record<string, unknown>[] = [];
    const 찍힘 = vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await 실행(['/Pool/Ghost(Clone)[0]'], 트리(), {}, 가짜(명령))).toBe(0);
    const 글 = 찍힘.mock.calls.flat().join('\n');
    expect(글).toContain('엔진 부품: Transform');
    expect(글).toContain('HP.Value=7 · MaxHP=20');
    expect(명령.map((x) => x.cmd).filter((x) => !['components', 'members', 'get', 'scenes'].includes(String(x)))).toEqual([]);
  });

  it('자료 폴더가 있으면 손으로 부른 펼치기도 값 파일을 남긴다', async () => {
    const 자료 = mkdtempSync(join(tmpdir(), 'game-props-data-'));
    자리들.push(자료);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    expect(await 실행(['/Pool/Ghost(Clone)[0]'], 트리(), { AUTHORING_GAME_DIR: 자료 }, 가짜([]))).toBe(0);
    const 파일 = JSON.parse(readFileSync(join(자료, 'game-props', 'Ghost.json'), 'utf8')) as { 종류: string; 출처: string; 칸: Record<string, unknown> };
    expect(파일).toMatchObject({ 종류: 'Ghost', 출처: '실행 중' });
    expect(파일.칸['MonsterHP.MaxHP']).toBe(20);
  });

  it('주소가 없거나 잡은 디바이스가 없으면 2', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await 실행([], 트리(), {}, 가짜([]))).toBe(2);
    expect(await 실행(['/a'], 트리(false), {}, 가짜([]))).toBe(2);
  });
});
