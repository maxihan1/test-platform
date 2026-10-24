import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새캐릭터, 오류코드, type 캐릭터 } from './helpers/game-state.helper.js';
import { 상점팔기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-150',
  name: '장착한 짧은 검을 팔려 하면 409 「ITEM_EQUIPPED」이고 짧은 검이 그대로 장착돼 있다',
  platforms: ['android'],
  precondition: ['짧은 검을 장착한 새 캐릭터가 있다'],
  techniques: ['상태 전이'],
  elements: ['item:sword_short', 'flow:골드-상점판매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 검 = 0;
  try {
    await test.step('짧은 검을 장착한 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa150');
      검 = (await 가방(admin, 나)).items.find((x) => x.templateId === 'sword_short')?.id ?? 0;
    });

    await test.step('짧은 검을 장착했는지 확인한다', async () => {
      const 그검 = (await 가방(admin, 나!)).items.find((x) => x.id === 검);
      await verify('짧은 검을 장착하고 있다', 그검 !== undefined && 그검.equippedSlot !== null, true, { blocker: true });
    });

    await test.step('장착한 짧은 검을 판다', async () => {
      const 응답 = await 상점팔기(admin, 나!, 검, 1);
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「ITEM_EQUIPPED」다', await 오류코드(응답), 'ITEM_EQUIPPED');
      const 그검 = (await 가방(admin, 나!)).items.find((x) => x.id === 검);
      const 장착 = await verify('짧은 검이 그대로 장착돼 있다', 그검 !== undefined && 그검.equippedSlot !== null, true);
      await verify('장착한 짧은 검을 팔려 하면 409 「ITEM_EQUIPPED」이고 짧은 검이 그대로 장착돼 있다', 코드 && 이름 && 장착, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
