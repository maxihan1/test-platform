import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, type 캐릭터 } from './helpers/api.helper.js';
import { 가방채우기, 새캐릭터, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 구매하기, 오류코드 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-140',
  name: '39칸 찬 가방으로 짧은 검을 사면 사진다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터의 가방이 39칸 차 있다', '새 전사 캐릭터의 가방이 40칸 꽉 차 있다'],
  techniques: ['경계값 분석'],
  elements: ['item:sword_short', 'flow:골드-상점구매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 빈칸하나: 캐릭터 | undefined;
  let 꽉참: 캐릭터 | undefined;
  try {
    await test.step('가방이 39칸 찬 캐릭터와 40칸 꽉 찬 캐릭터를 만든다', async () => {
      빈칸하나 = await 새캐릭터(admin, 'qafn140');
      꽉참 = await 새캐릭터(admin, 'qafn140');
      await 가방채우기(admin, 빈칸하나, 1);
      await 가방채우기(admin, 꽉참, 0);
    });
    await test.step('두 캐릭터의 가방 사용 칸을 확인한다', async () => {
      await verify('첫째 캐릭터의 가방 사용 칸이 39 이다', (await 가방받기(request, 빈칸하나!)).used, 39, { blocker: true });
      await verify('둘째 캐릭터의 가방 사용 칸이 40 이다', (await 가방받기(request, 꽉참!)).used, 40, { blocker: true });
    });
    await test.step('짧은 검을 산다', async () => {
      const 산 = await 구매하기(request, 빈칸하나!, 'sword_short');
      await verify('39칸 찬 가방으로 짧은 검을 사면 사진다', 산.ok(), true);
      const 거절 = await 구매하기(request, 꽉참!, 'sword_short');
      const 상태 = await verify('둘째 캐릭터의 구매 응답 코드가 409 이다', 거절.status(), 409);
      const 코드 = await verify('둘째 캐릭터의 구매 오류 코드가 「INVENTORY_FULL」이다', await 오류코드(거절), 'INVENTORY_FULL');
      await verify('40칸 꽉 찬 가방으로 짧은 검을 사면 409 「INVENTORY_FULL」이다', 상태 && 코드, true);
    });
    await test.step('짧은 검을 산 뒤 골드와 가방을 받는다', async () => {
      const 골드전 = (await 캐릭터읽기(admin, 꽉참!)).gold;
      const 칸전 = (await 가방받기(request, 꽉참!)).used;
      await 구매하기(request, 꽉참!, 'sword_short');
      const 골드후 = (await 캐릭터읽기(admin, 꽉참!)).gold;
      const 칸후 = (await 가방받기(request, 꽉참!)).used;
      const 골드그대로 = await verify('거부된 구매 뒤 골드가 그대로다', 골드후, 골드전);
      const 가방그대로 = await verify('거부된 구매 뒤 가방 사용 칸이 그대로다', 칸후, 칸전);
      await verify('가방이 꽉 차 구매가 거부되면 골드와 가방이 그대로다', 골드그대로 && 가방그대로, true);
    });
  } finally {
    if (빈칸하나 !== undefined) await 캐릭터지우기(admin, 빈칸하나);
    if (꽉참 !== undefined) await 캐릭터지우기(admin, 꽉참);
  }
});
