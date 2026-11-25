// 물음 트리 — 어디서 나왔나 잇기 · 게임 글로 읽기만 한 것 · 막힘과 닫음 · 서로를 가리키는 줄 · 판에서 안 써 본 것 (도메인/게임 §3.10 「게임 배우기」)
import { describe, expect, it } from 'vitest';

import { 점검, 지도읽기 } from './authoring-game-find.js';
import { 안써봄들, 열린물음, 물음트리 } from './authoring-game-tree.js';

type 줄재료 = [kind: string, key: string, name: string, learned: object];
const 지도 = (줄들: 줄재료[]) => {
  const 종류 = [...new Set(줄들.map((x) => x[0]))];
  return 지도읽기(['# 게임 지도', '', ...종류.flatMap((k) => [`## ${k} (${k}) — ${줄들.filter((x) => x[0] === k).length}개`, ...줄들.filter((x) => x[0] === k).map(([, key, name, l]) => `- ${key} · ${name} · 배움 ${JSON.stringify(l)}`)])].join('\n'));
};
const 오늘 = '2026-11-25';
const 물음 = (key: string, data?: object, build?: string): 줄재료 => ['ASK', key, key.slice(4), { text: 'ㄱ', belief: 'GUESS', ...(data === undefined ? {} : { data }), ...(build === undefined ? {} : { build }) }];
const 글줄 = (key: string, data?: object): 줄재료 => ['RULE', key, key.slice(5), { text: 'ㄱ', belief: 'GAME_TEXT', build: '1', ...(data === undefined ? {} : { data }) }];
const 본줄 = (key: string, data: object, x: object = {}): 줄재료 => ['RULE', key, key.slice(5), { text: 'ㄱ', belief: 'SEEN', seen: 1, build: '1', data, ...x }];

describe('물음트리', () => {
  it('열린 물음을 그것이 나온 줄 아래에 들여쓴다 — 열린 물음이 없는 줄은 안 보인다', () => {
    const 줄들 = 지도([
      본줄('rule:악마', {}),
      본줄('rule:고기', { 어디서: 'rule:악마' }),
      본줄('rule:딴것', { 어디서: 'rule:악마' }),
      물음('ask:몇 개', { 어디서: 'rule:고기' }),
      물음('ask:기절', { 어디서: 'rule:악마' }),
      물음('ask:홀로'),
    ]);
    expect(물음트리(줄들, 오늘)).toEqual(['- rule:악마 · 악마 [덜 봄]', '  - rule:고기 · 고기 [덜 봄]', '    - ? ask:몇 개 · 몇 개', '  - ? ask:기절 · 기절', '- ? ask:홀로 · 홀로']);
  });

  it('게임 글로 읽기만 한 것은 한 줄로 모으고, 거기서 물음이 나왔으면 트리에 둔다', () => {
    const 줄들 = 지도([글줄('rule:폭탄'), 글줄('rule:보스'), ...Array.from({ length: 12 }, (_, i) => 글줄(`rule:글${i}`)), 물음('ask:세지나', { 어디서: 'rule:폭탄' })]);
    const 줄 = 물음트리(줄들, 오늘);
    expect(줄.slice(0, 2)).toEqual(['- ? rule:폭탄 · 폭탄 [게임 글]', '  - ? ask:세지나 · 세지나']);
    expect(줄[2]).toBe(`- ? 게임 글로 읽기만 하고 안 해 본 것 13: rule:보스 · ${Array.from({ length: 11 }, (_, i) => `rule:글${i}`).join(' · ')} 외 1개`);
    expect(물음트리(줄들, 오늘, undefined, true)).toHaveLength(15);
  });

  it('없는 줄을 가리키면 맨 위에, 서로를 가리켜도 빠뜨리거나 돌지 않는다', () => {
    const 줄 = 물음트리(지도([물음('ask:가', { 어디서: 'ask:나' }), 물음('ask:나', { 어디서: 'ask:가' }), 물음('ask:다', { 어디서: 'rule:지움' })]), 오늘);
    expect(줄).toEqual(['- ? ask:다 · 다', '- ? ask:가 · 가', '  - ? ask:나 · 나']);
  });
});

describe('열린물음', () => {
  it('막힌 것은 빌드가 바뀌어야, 볼 날이 있으면 그날부터 — 물을 것이 아니라고 닫은 게임 글과 쪽지는 안 센다', () => {
    const 줄들 = 지도([
      물음('ask:막힘', { 막힘: '못 이김' }, '1'), 물음('ask:날', { 볼날: '2026-11-26' }), 글줄('rule:안내', { 닫음: '조작 안내' }), 글줄('rule:보스', { 막힘: '6웨이브를 못 감' }),
      ['PLAY', 'play:쪽지', '쪽지', { text: 'ㄱ', belief: 'GAME_TEXT' }],
    ]);
    expect(열린물음(줄들, 오늘, '1').map((x) => x.key)).toEqual([]);
    expect(열린물음(줄들, '2026-11-26', '2').map((x) => x.key)).toEqual(['ask:막힘', 'ask:날', 'rule:보스']);
  });
});

describe('안써봄들 · 올릴 것', () => {
  it('판에서 쓸 법을 적고 써 본 적이 없는 줄', () => {
    expect(안써봄들(지도([본줄('rule:치료', { 쓸법: '체력이 낮은 식물부터' }), 본줄('rule:폭탄', { 쓸법: '가까이 오면', 써봄: '22판 — 덜 깎임' }), 본줄('rule:글', {})])).map((x) => x.key)).toEqual(['rule:치료']);
  });

  it('점검은 두 번 넘게 봤는데 덜 봄인 줄을 올릴 것으로 짚는다 — 랜덤 · 치트 · 한 번 본 줄은 뺀다', () => {
    const 줄들 = 지도([본줄('rule:먹이', {}, { seen: 2, shape: 'FIXED' }), 본줄('rule:드랍', {}, { seen: 3, shape: 'RATE' }), 본줄('rule:치트', {}, { seen: 2, marks: ['CHEAT'] }), 본줄('rule:한번', {}), 물음('ask:가')]);
    expect(점검(줄들, '1').filter((x) => x.startsWith('올릴 것'))).toEqual(['올릴 것: rule:먹이 — 2번 봤는데 덜 봄. 조건을 바꿔 원래 속도로 한 번 더 재고 맞으면 확인으로']);
  });
});
