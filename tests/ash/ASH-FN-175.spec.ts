import { defineCase, test, verify } from '@platform/kit';

import { 가방, 강화하기, 계정지우기, 바꾸기, 새아이템주기, 새캐릭터, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-175',
  name: '짧은 검에 무기 강화 주문서를 쓰면 강화된다',
  platforms: ['android'],
  precondition: ['짧은 검과 무기 강화 주문서를 가진 새 캐릭터가 있다'],
  elements: ['item:sword_short', 'item:scroll_weapon', 'rate:enhance_1-3'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 검 = 0;
  let 주문서 = 0;
  try {
    await test.step('짧은 검과 무기 강화 주문서를 가진 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa175');
      await 바꾸기(admin, 나, { gold: 10000 });
      검 = (await 새아이템주기(admin, 나, 'sword_short')).id;
      주문서 = (await 새아이템주기(admin, 나, 'scroll_weapon', { 수량: 5 })).id;
    });

    await test.step('가방에 짧은 검과 무기 강화 주문서가 있는지 확인한다', async () => {
      const 지금 = await 가방(admin, 나!);
      await verify('가방에 짧은 검이 있다', 지금.items.some((x) => x.id === 검), true, { blocker: true });
      await verify('가방에 무기 강화 주문서가 있다', 지금.items.some((x) => x.id === 주문서), true, { blocker: true });
    });

    await test.step('짧은 검에 무기 강화 주문서를 쓴다', async () => {
      const 응답 = await 강화하기(admin, 나!, 검, 주문서);
      const 코드 = await verify('강화 응답 코드가 200 이다', 응답.status(), 200);
      const 그검 = (await 가방(admin, 나!)).items.find((x) => x.id === 검);
      const 단계 = await verify('짧은 검이 +1 이 된다', 그검?.enhanceLevel, 1);
      await verify('짧은 검에 무기 강화 주문서를 쓰면 강화된다', 코드 && 단계, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
