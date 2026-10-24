import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 상점목록, 소모품줄 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-103',
  name: '소모품 · 주문서의 종류 · 구매가 · 판매가 · 회복량이 아이템 표 값과 같다',
  platforms: ['android'],
  precondition: ['새 캐릭터가 있다'],
  elements: ['item:potion_hp_s', 'item:potion_hp_l', 'item:potion_mp_s', 'item:scroll_weapon', 'item:scroll_armor'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa103');
    });

    await test.step('새 캐릭터가 있는지 확인한다', async () => {
      await verify('새 캐릭터가 있다', (await 캐릭터읽기(admin, 나!)).name, 나!.이름, { blocker: true });
    });

    await test.step('소모품 · 주문서를 받고 상점 목록과 가방을 읽는다', async () => {
      const 목록 = await 상점목록(admin, 나!);
      const 빨강 = await verify.element(
        '빨간 물약의 종류 · 구매가 · 판매가 · 회복량이 아이템 표 값과 같다',
        'item:potion_hp_s',
        await 소모품줄(admin, 나!, 목록, 'potion_hp_s'),
        '종류 소모품 · 구매가 30 · 판매가 10 · 회복 HP 60 · MP 0',
      );
      const 진한빨강 = await verify.element(
        '진한 빨간 물약의 종류 · 구매가 · 판매가 · 회복량이 아이템 표 값과 같다',
        'item:potion_hp_l',
        await 소모품줄(admin, 나!, 목록, 'potion_hp_l'),
        '종류 소모품 · 구매가 120 · 판매가 40 · 회복 HP 200 · MP 0',
      );
      const 파랑 = await verify.element(
        '파란 물약의 종류 · 구매가 · 판매가 · 회복량이 아이템 표 값과 같다',
        'item:potion_mp_s',
        await 소모품줄(admin, 나!, 목록, 'potion_mp_s'),
        '종류 소모품 · 구매가 40 · 판매가 12 · 회복 HP 0 · MP 40',
      );
      const 무기주문서 = await verify.element(
        '무기 강화 주문서의 종류 · 구매가 · 판매가가 아이템 표 값과 같다',
        'item:scroll_weapon',
        await 소모품줄(admin, 나!, 목록, 'scroll_weapon'),
        '종류 주문서 · 구매가 500 · 판매가 150 · 회복 없음',
      );
      const 방어구주문서 = await verify.element(
        '방어구 강화 주문서의 종류 · 구매가 · 판매가가 아이템 표 값과 같다',
        'item:scroll_armor',
        await 소모품줄(admin, 나!, 목록, 'scroll_armor'),
        '종류 주문서 · 구매가 400 · 판매가 120 · 회복 없음',
      );
      await verify('소모품 · 주문서의 종류 · 구매가 · 판매가 · 회복량이 아이템 표 값과 같다', 빨강 && 진한빨강 && 파랑 && 무기주문서 && 방어구주문서, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
