// 비전 점검 파일 읽기 · 화면 찾기 · 단계 맞추기의 순수 셈

import { describe, expect, it } from 'vitest';

import { type 화면파일, 단계찾기, 열쇠찾기, 점검읽기, 화면줄들 } from './uiCheck.js';

const 앱파일들: 화면파일[] = [
  { file: 'tests/dma/pages/cart.page.ts', key: 'app:.MainActivity/cart_list', 글: "this.driver.$('id=select_all'); this.driver.$('id=title')" },
  { file: 'tests/dma/pages/order.page.ts', key: 'app:.MainActivity/order', 글: "this.driver.$('id=order_button'); this.driver.$('id=title')" },
  { file: 'tests/dma/pages/sub.page.ts', key: 'app:.MainActivity/sub', 글: "this.driver.$('id=sub_title')" },
];
const 화면 = (덧: object) => ({ before: 'element/click', at: '2026-11-07T00:00:05.000Z', status: 'done' as const, issues: [], ...덧 });

describe('점검읽기', () => {
  it('꼴이 틀린 화면 줄은 버리고 폴더 밖을 가리키는 파일 이름은 안 싣는다', () => {
    const 읽음 = 점검읽기({
      status: 'done',
      screens: [
        { before: 'element/click', at: '2026-11-07T00:00:01.000Z', status: 'done', file: '../x.png', issues: [{ kind: 'overlap', box: [1, 2, 3, 4], note: '겹침' }] },
        { at: 'nope', status: 'done' },
        { before: 'game tap', at: '2026-11-07T00:00:02.000Z', status: 'done', file: 'ui-002.png', issues: [] },
      ],
    });
    expect(읽음?.screens).toHaveLength(2);
    expect(읽음?.screens[0]).not.toHaveProperty('file');
    expect(읽음?.screens[1]?.file).toBe('ui-002.png');
  });

  it('상태가 모르는 값이면 null 이다', () => {
    expect(점검읽기({ status: 'weird', screens: [] })).toBeNull();
  });
});

describe('열쇠찾기', () => {
  it('앱은 패키지를 붙인 id 도 짧은 id 로 맞추고 다른 id 안의 글자에는 안 맞는다', () => {
    expect(열쇠찾기(화면({ locator: { using: 'id', value: 'com.demo:id/select_all' } }), 앱파일들, null).key).toBe('app:.MainActivity/cart_list');
    expect(열쇠찾기(화면({ locator: { using: 'id', value: 'sub_title' } }), 앱파일들, null).key).toBe('app:.MainActivity/sub');
  });

  it('앱 locator 가 두 파일에 있으면 앞 화면 줄의 파일을 따르고, 그래도 모르면 null 이다', () => {
    const s = 화면({ locator: { using: 'id', value: 'title' } });
    expect(열쇠찾기(s, 앱파일들, 'tests/dma/pages/order.page.ts').key).toBe('app:.MainActivity/order');
    expect(열쇠찾기(s, 앱파일들, null).key).toBeNull();
  });

  it('게임 경로는 그 아래인 가장 깊은 창이고, 이름은 그 이름을 가진 파일이다', () => {
    const 게임: 화면파일[] = [
      { file: 'a', key: 'game:World/WorldRoot/HudCanvas', 글: '' },
      { file: 'b', key: 'game:World/WorldRoot/HudCanvas/PanelLayer/EnhancePanel', 글: "game.click('Npc_npc_enhancer')" },
    ];
    expect(열쇠찾기(화면({ game: { target: '/WorldRoot/HudCanvas/PanelLayer/EnhancePanel/Window/Body' } }), 게임, null).key).toBe(
      'game:World/WorldRoot/HudCanvas/PanelLayer/EnhancePanel',
    );
    expect(열쇠찾기(화면({ game: { target: 'Npc_npc_enhancer' } }), 게임, null).key).toBe('game:World/WorldRoot/HudCanvas/PanelLayer/EnhancePanel');
  });

  it('웹은 주소를 같은 틀로 바꾼다', () => {
    expect(열쇠찾기(화면({ url: 'https://shop.test/goods/12' }), [], null).key).toBe('/goods/:n');
  });
});

describe('단계찾기', () => {
  it('항목이 끝난 때에서 거꾸로 단계 시작을 놓고 찍은 시각이 든 단계를 고른다', () => {
    const 단계들 = [{ seq: 1, durationMs: 1000 }, { seq: 2, durationMs: 2000 }, { seq: 3, durationMs: 1000 }];
    expect(단계찾기(10_500, 14_000, 단계들)).toBe(1);
    expect(단계찾기(12_000, 14_000, 단계들)).toBe(2);
    expect(단계찾기(13_500, 14_000, 단계들)).toBe(3);
    expect(단계찾기(1_000, 14_000, 단계들)).toBe(1);
    expect(단계찾기(1_000, 14_000, [])).toBeNull();
  });
});

describe('화면줄들', () => {
  it('못 찾은 화면은 unknown:<tcId>#<단계> 열쇠이고 찾은 파일이 다음 줄의 앞 파일이 된다', () => {
    const 줄 = 화면줄들(
      {
        status: 'done',
        screens: [
          화면({ at: '2026-11-07T00:00:01.000Z', locator: { using: 'id', value: 'order_button' } }),
          화면({ at: '2026-11-07T00:00:02.000Z', locator: { using: 'id', value: 'title' } }),
          화면({ at: '2026-11-07T00:00:03.000Z', before: 'actions' }),
        ],
      },
      'DMA-UI-031',
      앱파일들,
      Date.parse('2026-11-07T00:00:04.000Z'),
      [{ seq: 1, durationMs: 2500 }, { seq: 2, durationMs: 1000 }],
    );
    expect(줄.map((x) => x.key)).toEqual(['app:.MainActivity/order', 'app:.MainActivity/order', 'unknown:DMA-UI-031#2']);
  });
});
