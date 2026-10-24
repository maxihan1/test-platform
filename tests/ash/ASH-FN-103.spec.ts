import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 표읽기 } from './helpers/shop.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-103',
  name: '소모품 · 주문서 줄마다 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['item:potion_hp_s', 'item:potion_hp_l', 'item:potion_mp_s', 'item:scroll_weapon', 'item:scroll_armor', 'npc:상인'],
  params: null,
  expected: null,
});

test(spec, async ({ game, admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn103');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터의 구역이 「Town」이다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('상점 목록 · 가방 · 템플릿을 받아 소모품 · 주문서 줄을 견준다', async () => {
      const 표 = await 표읽기(request, admin, 누구!, ['potion_hp_s', 'potion_hp_l', 'potion_mp_s', 'scroll_weapon', 'scroll_armor']);
      const 빨간 = await verify.element('빨간 물약 줄의 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:potion_hp_s', 표.potion_hp_s, { 상점: true, 구매가: 30, 판매가: 10 });
      const 진한 = await verify.element('진한 빨간 물약 줄의 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:potion_hp_l', 표.potion_hp_l, { 상점: true, 구매가: 120, 판매가: 40 });
      const 파란 = await verify.element('파란 물약 줄의 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:potion_mp_s', 표.potion_mp_s, { 상점: true, 구매가: 40, 판매가: 12 });
      const 무기주문서 = await verify.element('무기 강화 주문서 줄의 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:scroll_weapon', 표.scroll_weapon, { 상점: true, 구매가: 500, 판매가: 150 });
      const 방어구주문서 = await verify.element('방어구 강화 주문서 줄의 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 'item:scroll_armor', 표.scroll_armor, { 상점: true, 구매가: 400, 판매가: 120 });
      await verify('소모품 · 주문서 줄마다 구매가 · 판매가 · 상점 판매 여부가 아이템 표와 같다', 빨간 && 진한 && 파란 && 무기주문서 && 방어구주문서, true);
    });
    await test.step('새 전사 캐릭터로 게임에 들어간다', async () => {
      const 월드 = await 게임입장(game, 누구!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('상점 창을 열어 빨간 물약 줄을 읽는다', async () => {
      const 창 = await 상점창.열기(game);
      await verify('상점 창의 빨간 물약 줄에 아이템 표의 구매가 「30 골드」가 보인다', await 창.가격글('potion_hp_s'), '30 골드');
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
