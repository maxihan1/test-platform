import { defineCase, test, verify } from '@platform/kit';

import { 물약사고팔기, 새캐릭터자리 } from './helpers/admin.helper.js';
import { type 캐릭터 } from './helpers/api.helper.js';
import { 원장읽기, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-520',
  name: '어드민 원장도 최신 줄이 맨 앞이다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Town', 'item:potion_hp_s', 'flow:골드-상점구매', 'flow:골드-상점판매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn520');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('물약을 사고 판 뒤 어드민으로 원장을 받는다', async () => {
      const 나 = 누구!;
      await 물약사고팔기(request, 나);
      const 원장 = await 원장읽기(admin, 나);
      const 맨앞 = await verify('어드민 원장 맨 앞 줄이 마지막에 한 판매다', 원장[0]?.reason, 'SHOP_SELL');
      const 차례 = await verify('어드민 원장 번호가 앞줄일수록 크다', (원장[0]?.id ?? 0) > (원장[1]?.id ?? 0), true);
      await verify('어드민 원장도 최신 줄이 맨 앞이다', 맨앞 && 차례, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
