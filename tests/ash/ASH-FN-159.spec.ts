import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터 } from './helpers/api.helper.js';
import { 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 구매하기, 새골드캐릭터, 오류코드 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-159',
  name: '골드 0 인 캐릭터가 빨간 물약을 사면 409 「INSUFFICIENT_GOLD」다',
  platforms: ['android'],
  precondition: ['골드 0 인 새 전사 캐릭터가 있다'],
  techniques: ['동등 분할'],
  elements: ['item:potion_hp_s', 'flow:골드-상점구매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('골드 0 인 새 전사 캐릭터를 만든다', async () => {
      누구 = await 새골드캐릭터(admin, 'qafn159', 0);
    });
    await test.step('새 캐릭터의 골드를 확인한다', async () => {
      await verify('새 캐릭터의 골드가 0 이다', (await 캐릭터읽기(admin, 누구!)).gold, 0, { blocker: true });
    });
    await test.step('빨간 물약 1개를 산다', async () => {
      const 응답 = await 구매하기(request, 누구!, 'potion_hp_s');
      const 상태 = await verify('구매 응답 코드가 409 이다', 응답.status(), 409);
      const 코드 = await verify('구매 오류 코드가 「INSUFFICIENT_GOLD」이다', await 오류코드(응답), 'INSUFFICIENT_GOLD');
      await verify('골드 0 인 캐릭터가 빨간 물약을 사면 409 「INSUFFICIENT_GOLD」다', 상태 && 코드, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
