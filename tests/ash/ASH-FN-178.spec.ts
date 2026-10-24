import { defineCase, test, verify } from '@platform/kit';

import { 가방, 강화하기, 계정지우기, 바꾸기, 새아이템주기, 새캐릭터, type 캐릭터 } from './helpers/game-state.helper.js';
import { 개수 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-178',
  name: '+2 짧은 검을 한 번 강화하면 골드가 300 줄고 주문서가 1장 준다',
  platforms: ['android'],
  smoke: true,
  precondition: ['+2 짧은 검과 무기 강화 주문서 5장을 가진 새 캐릭터의 골드가 1000 이다'],
  elements: ['item:sword_short', 'item:scroll_weapon', 'rate:enhance_1-3', 'flow:골드-강화'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 검 = 0;
  let 주문서 = 0;
  try {
    await test.step('+2 짧은 검과 무기 강화 주문서 5장을 가진 새 캐릭터를 만들고 골드를 1000 으로 맞춘다', async () => {
      나 = await 새캐릭터(admin, 'zqa178');
      await 바꾸기(admin, 나, { gold: 1000 });
      검 = (await 새아이템주기(admin, 나, 'sword_short', { 강화: 2 })).id;
      주문서 = (await 새아이템주기(admin, 나, 'scroll_weapon', { 수량: 5 })).id;
    });

    await test.step('가방에 +2 짧은 검과 주문서 5장이 있고 골드가 1000 인지 확인한다', async () => {
      const 지금 = await 가방(admin, 나!);
      await verify('가방에 +2 짧은 검이 있다', 지금.items.find((x) => x.id === 검)?.enhanceLevel, 2, { blocker: true });
      await verify('무기 강화 주문서가 5장이다', 개수(지금, 'scroll_weapon'), 5, { blocker: true });
      await verify('골드가 1000 이다', 지금.gold, 1000, { blocker: true });
    });

    await test.step('+2 짧은 검을 강화한다', async () => {
      const 앞 = await 가방(admin, 나!);
      const 코드 = await verify('강화 응답 코드가 200 이다', (await 강화하기(admin, 나!, 검, 주문서)).status(), 200);
      const 뒤 = await 가방(admin, 나!);
      const 골드 = await verify('골드가 300 줄어든다', 앞.gold - 뒤.gold, 300);
      const 장수 = await verify('주문서가 1장 줄어든다', 개수(앞, 'scroll_weapon') - 개수(뒤, 'scroll_weapon'), 1);
      await verify('+2 짧은 검을 한 번 강화하면 골드가 300 줄고 주문서가 1장 준다', 코드 && 골드 && 장수, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
