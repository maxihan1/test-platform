// 오브젝트 펼치기 — 값 · 묶음 · 목록 · 빈 칸 · 함수로 가르기, 네트워크 틀 거르기, 네트워크 값 읽기 (도메인/게임 §3.10 「오브젝트 펼치기」)
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Command, Link } from 'control-cli';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type 펼친것, 더읽을것, 펼친글, 실행 } from './authoring-game-props.js';

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
    expect(명령.map((x) => x.cmd).filter((x) => !['components', 'members', 'get'].includes(String(x)))).toEqual([]);
  });

  it('주소가 없거나 잡은 디바이스가 없으면 2', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await 실행([], 트리(), {}, 가짜([]))).toBe(2);
    expect(await 실행(['/a'], 트리(false), {}, 가짜([]))).toBe(2);
  });
});
