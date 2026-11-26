// 판 도중 새로 나온 것 검사 — 종류로 묶어 맨 위 것만 세기 · 지도에 없는 새 종류만 한 번 펼치기 · 장면이 바뀌면 처음을 다시 잡기 · 판 끝 줄과 기록 파일 (도메인/게임 §3.10 「조작 도우미」)
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Found, Game } from 'control-cli';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { 기록남기기 } from './authoring-game-play-log.js';
import { type 나온것, 나온것줄, 세기, 세기시작, 종류, 지도글, 지도에있나, 펼칠상한 } from './authoring-game-play-spawns.js';
import { 막는글, 안적은새것 } from './authoring-game-play-gate.js';
import { 돌린다, 실행 } from './authoring-game-play.js';
import { 게임자료환경 } from './authoring-check-game.js';

let 자리들: string[] = [];
afterEach(() => {
  for (const d of 자리들) rmSync(d, { recursive: true, force: true });
  자리들 = [];
  vi.restoreAllMocks();
});

const 것 = (path: string, id?: string): Found => ({ path, ...(id === undefined ? {} : { id }) });
const 바탕 = [것('/Main Camera'), 것('/Stage'), 것('/Stage/Tree (1)'), 것('/Stage/Tree (2)'), 것('/Enemies'), 것('/Canvas'), 것('/Canvas/HP')];

/** 가짜 게임 — find-all 을 부를 때마다 목록을 하나씩 넘기고 마지막 것을 되풀이한다 */
function 가짜(목록들: Found[][], 장면들: string[] = ['Stage']): { game: Game; 펼친: string[]; 부름: () => number } {
  let n = 0;
  const 펼친: string[] = [];
  const game = {
    findAll: async (target: string) => {
      expect(target).toBe('//*');
      const 들 = 목록들[Math.min(n, 목록들.length - 1)]!;
      n += 1;
      return 들;
    },
    scenes: async () => ({ active: 장면들[Math.min(n - 1, 장면들.length - 1)]!, loaded: [], loads: 0, unloads: 0 }),
    components: async (주소: string) => {
      펼친.push(주소);
      return [{ name: 'Boss', type: 'Game.Boss' }, { name: 'Transform', type: 'UnityEngine.Transform' }];
    },
    members: async () => ({ fields: [{ name: 'Hp', type: 'Int32', value: 300 }], properties: [], methods: [{ name: 'Enrage', args: [] }] }),
    get: async () => 0,
  } as unknown as Game;
  return { game, 펼친, 부름: () => n };
}

const 쉼 = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe('판 도중 새로 나온 것', () => {
  it('종류는 (Clone) · (1) · [n] 꼬리를 떼고, 부모가 처음에 없던 것(새것 안의 부품)은 세지 않는다', () => {
    expect([종류('/Enemies/Ghost(Clone)'), 종류('/Stage/Tree (12)'), 종류('/Enemies/Ghost(Clone)[3]')]).toEqual(['Ghost', 'Tree', 'Ghost']);
    const 처음 = new Set(바탕.map((f) => f.path));
    const { 수, 하나 } = 세기([...바탕, 것('/Enemies/Ghost(Clone)', '7'), 것('/Enemies/Ghost(Clone)[1]', '8'), 것('/Enemies/Ghost(Clone)/Body'), 것('/Boss', '9'), 것('/Boss/Arm')], 처음);
    expect(수).toMatchObject({ Ghost: 2, Boss: 1, Tree: 2, Stage: 1 });
    expect(수).not.toHaveProperty('Body');
    expect(수).not.toHaveProperty('Arm');
    expect(하나.get('Boss')?.id).toBe('9');
    const 처음것 = [...바탕, 것('/Enemies/Ghost(Clone)', '1'), 것('/Enemies/Ghost(Clone)/Fx')];
    const 바뀐것 = [...바탕, 것('/Enemies/Ghost(Clone)', '2'), 것('/Enemies/Ghost(Clone)/Body')];
    const 처음번호 = new Set(처음것.flatMap((f) => (f.id === undefined ? [] : [f.id])));
    expect(세기(바뀐것, new Set(처음것.map((f) => f.path)), 처음번호).수).not.toHaveProperty('Body');
  });

  it('지도에 없는 새 종류만 처음 보일 때 한 번 펼치고, 지도에 있는 것 · 처음부터 있던 것 · 화면 그림은 펼치지 않는다', async () => {
    const 보스판 = [...바탕, 것('/Enemies/Ghost(Clone)', '7'), 것('/Boss', '9'), 것('/Boss/Arm'), 것('/Canvas/ClearPopup')];
    const 끝판 = [...바탕, 것('/Boss', '9')];
    const g = 가짜([바탕, 보스판, 보스판, 끝판]);
    const 고리 = 세기시작(g.game, 10, Date.now(), '지도 줄: Ghost 는 기지로 간다 · Main Camera · Stage · Tree · Enemies');
    await 쉼(60);
    const { 나온, 못함 } = await 고리.끝난다();
    expect(못함).toBeNull();
    expect(g.펼친).toEqual(['//*[@id=9]']);
    expect(나온!.지도에없음).toEqual(['Boss']);
    expect(나온!.화면것).toEqual(['ClearPopup']);
    expect(나온!.펼침[0]).toMatchObject({ 종류: 'Boss', 주소: '//*[@id=9]' });
    expect(나온!.펼침[0]!.글!.join('\n')).toContain('Hp=300');
    expect(Object.keys(나온!.첫초).sort()).toEqual(['Boss', 'ClearPopup', 'Ghost']);
    const 줄 = 나온것줄(나온!, (초) => `화면-${Math.round(초)}`, '/자료/기록-새것.txt');
    expect(줄[0]).toContain('새로 나온 것 · 수가 바뀐 것 3종류');
    expect(줄.find((x) => x.includes(' Boss — '))).toMatch(/처음 0개 · \d+초에 나옴 · 가장 많을 때 1개\(\d+초\) · 끝 1개 · 지도에 없음 · 펼침 · 가까운 화면 화면-\d+/);
    expect(줄.find((x) => x.includes(' Ghost — '))).toMatch(/가장 많을 때 1개\(\d+초\) · 끝 0개 · 가까운 화면/);
    expect(줄.find((x) => x.includes('ClearPopup'))).toContain('  화면 ClearPopup — ');
    expect(줄.at(-1)).toBe('펼친 것 1종류 — /자료/기록-새것.txt');
  });

  it(`한 판에 ${펼칠상한}종류까지만 펼치고 나머지는 「안 펼침」으로 남긴다`, async () => {
    const 많이 = [...바탕, ...Array.from({ length: 펼칠상한 + 2 }, (_, i) => 것(`/Mob${i}`, String(100 + i)))];
    const g = 가짜([바탕, 많이]);
    const 고리 = 세기시작(g.game, 10, Date.now(), '');
    await 쉼(40);
    const { 나온 } = await 고리.끝난다();
    expect(g.펼친).toHaveLength(펼칠상한);
    expect(나온!.안펼침).toEqual([`Mob${펼칠상한}`, `Mob${펼칠상한 + 1}`]);
    expect(나온것줄(나온!, null, null).at(-1)).toContain(`Mob${펼칠상한} · Mob${펼칠상한 + 1}`);
  });

  it('장면이 바뀌면 바뀐 장면의 첫 목록을 처음으로 다시 잡는다 — 메뉴에서 판으로 들어가도 판의 모든 것이 새것이 되지 않는다', async () => {
    const 메뉴 = [것('/MenuRoot'), 것('/MenuRoot/Start')];
    const 판 = [...바탕, 것('/Enemies/Ghost(Clone)', '7')];
    const g = 가짜([메뉴, 메뉴, 바탕, 판], ['Menu', 'Menu', 'Stage', 'Stage']);
    const 고리 = 세기시작(g.game, 10, Date.now(), '');
    await 쉼(60);
    const { 나온 } = await 고리.끝난다();
    expect(나온!.장면바뀜).toEqual([expect.objectContaining({ 장면: 'Stage', 다시잡음: true })]);
    expect(Object.keys(나온!.첫초)).toEqual(['Ghost']);
    expect(나온것줄(나온!, null, null)[0]).toMatch(/^장면이 바뀜 \d+초 Stage/);
  });

  it('새것을 센 뒤 장면이 바뀌면(결과 화면) 센 것을 지우지 않고 그 뒤는 세지 않는다', async () => {
    const 판 = [...바탕, 것('/Boss', '9')];
    const g = 가짜([바탕, 판, [것('/Result')]], ['Stage', 'Stage', 'Result']);
    const 고리 = 세기시작(g.game, 10, Date.now(), '');
    await 쉼(60);
    const { 나온 } = await 고리.끝난다();
    expect(Object.keys(나온!.첫초)).toEqual(['Boss']);
    expect(나온!.장면바뀜).toEqual([expect.objectContaining({ 장면: 'Result', 다시잡음: false })]);
    const 줄 = 나온것줄(나온!, null, null);
    expect(줄[0]).toMatch(/앞 장면에서 새것을 셌으니 그 뒤는 세지 않았다$/);
    expect(줄.some((x) => x.includes(' Boss — '))).toBe(true);
  });

  it('그친다 — 펼치던 중이면 다음 명령에서 멈추고 실패로 세지 않으며, 끝 수만 한 번 더 센다. 준비는 처음 목록을 센 뒤 풀린다', async () => {
    const g = 가짜([바탕, [...바탕, 것('/Boss', '9')]]);
    let 풀어 = (): void => {};
    const 막힌 = { ...g.game, members: () => new Promise((r) => (풀어 = () => r({ fields: [], properties: [], methods: [] }))) } as unknown as Game;
    const 고리 = 세기시작(막힌, 10, Date.now(), '');
    await 고리.준비;
    expect(g.부름()).toBe(1);
    await 쉼(40);
    고리.그친다();
    const 뒤 = g.부름();
    풀어();
    const { 나온, 못함 } = await 고리.끝난다();
    expect(못함).toBeNull();
    expect(g.부름()).toBe(뒤 + 1);
    expect(나온!.펼침).toEqual([]);
    expect(나온!.안펼침).toEqual(['Boss']);
  });

  it('묶음 칸은 game-types.txt 의 칸 이름으로 읽어 값 파일로 남기고, 값 파일이 있는 종류는 다음 판에 다시 안 펼친다', async () => {
    const d = mkdtempSync(join(tmpdir(), 'spawns-'));
    자리들.push(d);
    writeFileSync(join(d, 'game-types.txt'), 'MonsterTypeData MaxHP:int Damage:float ItemDropData:PPtr<$ItemDropData> Drops:vector\nItemDropData Weight:float\n');
    const 읽음: string[] = [];
    const 묶음게임 = (목록: Found[]): Game => ({
      ...가짜([바탕, 목록]).game,
      components: async () => [{ name: 'MonsterAI', type: 'Game.MonsterAI' }, { name: 'Transform', type: 'UnityEngine.Transform' }],
      members: async () => ({ fields: [{ name: 'TypeData', type: 'MonsterTypeData', value: 'Ghost_Data (Game.Configuration.MonsterTypeData)' }, { name: 'Speed', type: 'Single', value: 3 }], properties: [], methods: [] }),
      get: async (_주소: string, 칸: string) => {
        읽음.push(칸);
        return { 'MonsterAI.TypeData.MaxHP': 30, 'MonsterAI.TypeData.Damage': 4.5, 'MonsterAI.TypeData.ItemDropData.Weight': 0.25 }[칸];
      },
    }) as unknown as Game;
    const 판 = [...바탕, 것('/Enemies/Ghost(Clone)', '7')];
    const 첫 = 세기시작(묶음게임(판), 10, Date.now(), '', d);
    await 쉼(60);
    const { 나온: 첫판 } = await 첫.끝난다();
    expect(읽음).toEqual(['MonsterAI.TypeData.MaxHP', 'MonsterAI.TypeData.Damage', 'MonsterAI.TypeData.ItemDropData.Weight']);
    expect(첫판!.펼침[0]!.글!.join('\n')).toContain('TypeData.MaxHP=30');
    const 파일 = JSON.parse(readFileSync(join(d, 'game-props', 'Ghost.json'), 'utf8')) as Record<string, unknown>;
    expect(파일).toMatchObject({ 종류: 'Ghost', 장면: 'Stage', 출처: '실행 중', 목록칸: ['MonsterAI.TypeData.Drops'], 칸: { 'MonsterAI.Speed': 3, 'MonsterAI.TypeData.MaxHP': 30, 'MonsterAI.TypeData.Damage': 4.5, 'MonsterAI.TypeData.ItemDropData.Weight': 0.25 } });
    expect(typeof 파일.읽은때).toBe('string');
    const 둘째 = 세기시작(묶음게임(판), 10, Date.now(), '', d);
    await 쉼(60);
    const { 나온: 둘째판 } = await 둘째.끝난다();
    expect(둘째판!.펼침).toEqual([]);
    expect(둘째판!.이미펼침).toEqual(['Ghost']);
    expect(나온것줄(둘째판!, null, null).join('\n')).toContain('값 파일 있음');
    expect(읽음).toHaveLength(3);
  });

  it('바뀐 것이 없으면 한 줄로 말하고, 세 번 이어 못 세면 그치고 한 줄만 남긴다', async () => {
    const 같음 = 세기시작(가짜([바탕]).game, 10, Date.now(), 'Main Camera · Stage · Tree · Enemies');
    await 쉼(30);
    expect(나온것줄((await 같음.끝난다()).나온!, null, null)).toEqual(['새로 나온 것 없음 — 0.01초마다 센 오브젝트 수가 처음과 같다']);
    let 부름 = 0;
    const 깨진 = { findAll: async () => { 부름 += 1; throw new Error('목록 거절'); }, scenes: async () => ({ active: 'S' }) } as unknown as Game;
    const 고리 = 세기시작(깨진, 5, Date.now(), '');
    await 쉼(80);
    expect(await 고리.끝난다()).toEqual({ 나온: null, 못함: '오브젝트 세기 3번 못 함: 목록 거절' });
    expect(부름).toBe(3);
  });

  it('지도 글은 받아 온 지도와 안 올린 배운 줄을 합친다 — 자료 폴더가 없으면 빈 글', () => {
    const d = mkdtempSync(join(tmpdir(), 'spawns-'));
    자리들.push(d);
    writeFileSync(join(d, 'game-map.txt'), '지도 Ghost');
    writeFileSync(join(d, 'game-learned.json'), '[{"name":"Meat"}]');
    expect(지도글(d)).toContain('Ghost');
    expect(지도글(d)).toContain('Meat');
    expect(지도글(undefined)).toBe('');
  });

  it('학습 세션이면 앞 판에 새로 나온 것을 지도에 적기 전에는 다음 판을 안 돌린다 — 적으면 돌고, 학습 표시가 없으면(시험 · 케이스) 안 막는다', async () => {
    const t = mkdtempSync(join(tmpdir(), 'spawns-'));
    자리들.push(t);
    mkdirSync(join(t, 'tests', 'g', 'helpers'), { recursive: true });
    mkdirSync(join(t, '.control-cli'));
    writeFileSync(join(t, '.control-cli', 'held'), 'pc-pc1\n');
    writeFileSync(join(t, 'tests', 'g', 'helpers', 'play.helper.ts'), 'export async function 깨기() { return 1; }');
    const d = join(t, 'data');
    mkdirSync(join(d, 'game-play'), { recursive: true });
    const 나온 = { 간격ms: 5000, 처음: {}, 장면바뀜: [], 센때: [], 첫초: { Boss: 10, Slime: 12 }, 화면것: [], 지도에없음: ['Boss', 'Slime'], 펼침: [], 안펼침: [] };
    writeFileSync(join(d, 'game-play', '20261126010000000-깨기.json'), JSON.stringify({ 함수: '깨기', 나온것: 나온 }));
    writeFileSync(join(d, 'game-play', '20261126020000000-깨기.json'), JSON.stringify({ 함수: '깨기' }));
    writeFileSync(join(d, 'game-map.txt'), '- rule:x · Slime 은 느리다 · BossSpawner 가 있다');
    expect(안적은새것(d)).toBeNull();
    writeFileSync(join(d, 'game-learning.now'), '1');
    expect(안적은새것(d)).toEqual({ 기록: join(d, 'game-play', '20261126010000000-깨기'), 이름들: ['Boss'], 처음: [] });
    const 오류 = vi.spyOn(console, 'error').mockImplementation(() => {});
    let 명령 = 0;
    const 길 = (async () => (명령 += 1, { ok: true })) as never;
    expect(await 실행(['g', 'play', '깨기', '[]', '--shots', '0'], t, { [게임자료환경]: d }, 길)).toBe(2);
    expect(명령).toBe(0);
    expect(String(오류.mock.calls[0]?.[0])).toContain('새로 나온 Boss 이(가) 지도에 없다');
    writeFileSync(join(d, 'game-learned.json'), JSON.stringify({ elements: [{ kind: 'ASK', key: 'ask:boss', name: 'Boss 는 무엇에 약한가' }] }));
    expect(안적은새것(d)).toBeNull();
    expect([지도에있나('BossSpawner', 'Boss'), 지도에있나('보스 Boss 는', 'Boss'), 지도에있나('"name":"Boss"', 'Boss'), 지도에있나('a.b', 'a+b')]).toEqual([false, true, true, false]);
  });

  it('장면 처음부터 있던 것 가운데 지도에 없는 것(화면 그림 빼고)도 남기고, 학습 세션이면 적기 전에는 다음 판을 안 돌린다', async () => {
    const 메뉴 = [것('/MenuRoot'), 것('/NavMesh Surface')];
    const g = 가짜([메뉴, 메뉴, 바탕, 바탕], ['Menu', 'Menu', 'Stage', 'Stage']);
    const 고리 = 세기시작(g.game, 10, Date.now(), '- probe:메뉴 · MenuRoot 는 첫 화면 · Stage 바닥');
    await 쉼(60);
    const { 나온 } = await 고리.끝난다();
    expect(나온!.처음지도에없음).toEqual(['NavMesh Surface', 'Main Camera', 'Tree', 'Enemies']);
    expect(나온것줄(나온!, null, null).join('\n')).toContain('장면 처음부터 있던 것 가운데 지도에 없는 것 4종류 — 펼쳐 보고 지도에 적어야 다음 판이 돈다: NavMesh Surface · Main Camera · Tree · Enemies');
    const d = mkdtempSync(join(tmpdir(), 'spawns-'));
    자리들.push(d);
    mkdirSync(join(d, 'game-play'));
    writeFileSync(join(d, 'game-play', '20261126010000000-깨기.json'), JSON.stringify({ 함수: '깨기', 나온것: 나온 }));
    writeFileSync(join(d, 'game-map.txt'), '- probe:카메라 · Main Camera 와 Tree 는 꾸밈');
    expect(안적은새것(d)).toBeNull();
    expect(안적은새것(d, false)).toEqual({ 기록: join(d, 'game-play', '20261126010000000-깨기'), 이름들: [], 처음: ['NavMesh Surface', 'Enemies'] });
    writeFileSync(join(d, 'game-learning.now'), '1');
    expect(막는글(안적은새것(d)!)).toContain('장면에 처음부터 있던 NavMesh Surface · Enemies 이(가) 지도에 없다');
  });

  it('판 돌리기는 도중 화면을 켰을 때만 세고, 기록 json 에는 펼친 글 없이 · 펼친 글은 -새것.txt 로 남긴다', async () => {
    const 꺼짐 = await 돌린다((async () => ({ ok: true })) as never, () => 1, {}, 300);
    expect(꺼짐.나온것).toBeUndefined();
    const t = mkdtempSync(join(tmpdir(), 'spawns-'));
    자리들.push(t);
    mkdirSync(join(t, 'data'));
    const 나온: 나온것 = { 간격ms: 5000, 처음: {}, 장면바뀜: [], 센때: [{ 초: 10, 수: { Boss: 1 } }], 첫초: { Boss: 10 }, 화면것: [], 지도에없음: ['Boss'], 처음지도에없음: [], 펼침: [{ 종류: 'Boss', 초: 10, 주소: '//*[@id=9]', 글: ['# //*[@id=9]', '  값 Hp=300'] }], 안펼침: [] };
    const r = { ...꺼짐, 나온것: 나온 };
    const 기록 = 기록남기기(join(t, 'data'), '깨기', [], r, [], new Date('2026-11-26T01:02:03.456Z'))!;
    const 남은 = readdirSync(join(t, 'data', 'game-play')).sort();
    expect(남은).toContain('20261126010203456-깨기-새것.txt');
    expect(readFileSync(`${기록}-새것.txt`, 'utf8')).toBe('## Boss — 10초에 처음 보임 · //*[@id=9]\n# //*[@id=9]\n  값 Hp=300');
    const json = JSON.parse(readFileSync(`${기록}.json`, 'utf8')) as { 나온것: 나온것 };
    expect(json.나온것.펼침).toEqual([{ 종류: 'Boss', 초: 10, 주소: '//*[@id=9]' }]);
  });
});
