import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새캐릭터, type 캐릭터 } from './helpers/game-state.helper.js';
import { 상점팔기, 장착해제 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-148',
  name: '짧은 검을 해제한 뒤 팔면 골드가 판매가 100 만큼 는다',
  platforms: ['android'],
  precondition: ['짧은 검을 장착한 새 캐릭터가 있다'],
  elements: ['item:sword_short', 'flow:골드-상점판매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 검 = 0;
  try {
    await test.step('짧은 검을 장착한 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa148');
      검 = (await 가방(admin, 나)).items.find((x) => x.templateId === 'sword_short')?.id ?? 0;
    });

    await test.step('짧은 검을 장착했는지 확인한다', async () => {
      const 그검 = (await 가방(admin, 나!)).items.find((x) => x.id === 검);
      await verify('짧은 검을 장착하고 있다', 그검 !== undefined && 그검.equippedSlot !== null, true, { blocker: true });
    });

    await test.step('짧은 검을 해제한 뒤 판다', async () => {
      const 앞 = (await 가방(admin, 나!)).gold;
      const 해제 = await verify('해제 응답 코드가 200 이다', (await 장착해제(admin, 나!, 검)).status(), 200);
      const 판매 = await verify('판매 응답 코드가 200 이다', (await 상점팔기(admin, 나!, 검, 1)).status(), 200);
      const 늘어남 = await verify('골드가 100 늘어난다', (await 가방(admin, 나!)).gold - 앞, 100);
      await verify('짧은 검을 해제한 뒤 팔면 골드가 판매가 100 만큼 는다', 해제 && 판매 && 늘어남, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
