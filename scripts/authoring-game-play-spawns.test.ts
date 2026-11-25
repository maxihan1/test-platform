// 판 도중 새로 나온 것 검사 — 종류로 묶어 맨 위 것만 세기 · 지도에 없는 새 종류만 한 번 펼치기 · 장면이 바뀌면 처음을 다시 잡기 · 판 끝 줄과 기록 파일 (도메인/게임 §3.10 「조작 도우미」)
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Found, Game } from 'control-cli';
import { afterEach, describe, expect, it } from 'vitest';

import { 기록남기기 } from './authoring-game-play-log.js';
import { type 나온것, 나온것줄, 세기, 세기시작, 종류, 지도글, 펼칠상한 } from './authoring-game-play-spawns.js';
import { 돌린다 } from './authoring-game-play.js';

let 자리들: string[] = [];
afterEach(() => {
  for (const d of 자리들) rmSync(d, { recursive: true, force: true });
  자리들 = [];
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
  });

  it('지도에 없는 새 종류만 처음 보일 때 한 번 펼치고, 지도에 있는 것 · 처음부터 있던 것 · 화면 그림은 펼치지 않는다', async () => {
    const 보스판 = [...바탕, 것('/Enemies/Ghost(Clone)', '7'), 것('/Boss', '9'), 것('/Boss/Arm'), 것('/Canvas/ClearPopup')];
    const 끝판 = [...바탕, 것('/Boss', '9')];
    const g = 가짜([바탕, 보스판, 보스판, 끝판]);
    const 고리 = 세기시작(g.game, 10, Date.now(), '지도 줄: Ghost 는 기지로 간다');
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
    const 많이 = [...바탕, ...Array.from({ length: 펼칠상한 + 2 }, (_, i) => 것(`/Mob${String.fromCharCode(65 + i)}`, String(100 + i)))];
    const g = 가짜([바탕, 많이]);
    const 고리 = 세기시작(g.game, 10, Date.now(), '');
    await 쉼(40);
    const { 나온 } = await 고리.끝난다();
    expect(g.펼친).toHaveLength(펼칠상한);
    expect(나온!.안펼침).toEqual(['MobK', 'MobL']);
    expect(나온것줄(나온!, null, null).at(-1)).toContain('MobK · MobL');
  });

  it('장면이 바뀌면 바뀐 장면의 첫 목록을 처음으로 다시 잡는다 — 메뉴에서 판으로 들어가도 판의 모든 것이 새것이 되지 않는다', async () => {
    const 메뉴 = [것('/MenuRoot'), 것('/MenuRoot/Start')];
    const 판 = [...바탕, 것('/Enemies/Ghost(Clone)', '7')];
    const g = 가짜([메뉴, 메뉴, 바탕, 판], ['Menu', 'Menu', 'Stage', 'Stage']);
    const 고리 = 세기시작(g.game, 10, Date.now(), '');
    await 쉼(60);
    const { 나온 } = await 고리.끝난다();
    expect(나온!.장면바뀜.map((x) => x.장면)).toEqual(['Stage']);
    expect(Object.keys(나온!.첫초)).toEqual(['Ghost']);
    expect(나온것줄(나온!, null, null)[0]).toMatch(/^장면이 바뀜 \d+초 Stage/);
  });

  it('바뀐 것이 없으면 한 줄로 말하고, 세 번 이어 못 세면 그치고 한 줄만 남긴다', async () => {
    const 같음 = 세기시작(가짜([바탕]).game, 10, Date.now(), '');
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

  it('판 돌리기는 도중 화면을 켰을 때만 세고, 기록 json 에는 펼친 글 없이 · 펼친 글은 -새것.txt 로 남긴다', async () => {
    const 꺼짐 = await 돌린다((async () => ({ ok: true })) as never, () => 1, {}, 300);
    expect(꺼짐.나온것).toBeUndefined();
    const t = mkdtempSync(join(tmpdir(), 'spawns-'));
    자리들.push(t);
    mkdirSync(join(t, 'data'));
    const 나온: 나온것 = { 간격ms: 5000, 처음: {}, 장면바뀜: [], 센때: [{ 초: 10, 수: { Boss: 1 } }], 첫초: { Boss: 10 }, 화면것: [], 지도에없음: ['Boss'], 펼침: [{ 종류: 'Boss', 초: 10, 주소: '//*[@id=9]', 글: ['# //*[@id=9]', '  값 Hp=300'] }], 안펼침: [] };
    const r = { ...꺼짐, 나온것: 나온 };
    const 기록 = 기록남기기(join(t, 'data'), '깨기', [], r, [], new Date('2026-11-26T01:02:03.456Z'))!;
    const 남은 = readdirSync(join(t, 'data', 'game-play')).sort();
    expect(남은).toContain('20261126010203456-깨기-새것.txt');
    expect(readFileSync(`${기록}-새것.txt`, 'utf8')).toBe('## Boss — 10초에 처음 보임 · //*[@id=9]\n# //*[@id=9]\n  값 Hp=300');
    const json = JSON.parse(readFileSync(`${기록}.json`, 'utf8')) as { 나온것: 나온것 };
    expect(json.나온것.펼침).toEqual([{ 종류: 'Boss', 초: 10, 주소: '//*[@id=9]' }]);
  });
});
