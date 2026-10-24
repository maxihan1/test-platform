import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새아이템주기, 새캐릭터, type 캐릭터 } from './helpers/game-state.helper.js';
import { 장착응답, 장착중인가 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-427',
  name: '롱 소드를 장착하면 짧은 검의 장착이 풀린다',
  platforms: ['android'],
  precondition: ['짧은 검을 장착하고 롱 소드를 가진 새 전사가 있다'],
  elements: ['item:sword_long', 'item:sword_short'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 짧은검 = 0;
  let 롱소드 = 0;
  try {
    await test.step('짧은 검을 장착하고 롱 소드를 가진 새 전사를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa427', 'Warrior');
      롱소드 = (await 새아이템주기(admin, 나, 'sword_long')).id;
    });

    await test.step('짧은 검이 장착돼 있고 롱 소드가 가방에 있는지 확인한다', async () => {
      const 지금 = await 가방(admin, 나!);
      const 검 = 지금.items.find((x) => x.templateId === 'sword_short' && x.equippedSlot !== null);
      짧은검 = 검?.id ?? 0;
      await verify('짧은 검이 장착돼 있다', 검 !== undefined, true, { blocker: true });
      await verify('롱 소드가 장착돼 있지 않다', 장착중인가(지금, 롱소드), false, { blocker: true });
    });

    await test.step('롱 소드를 장착한다', async () => {
      const 응답 = await 장착응답(admin, 나!, 롱소드);
      await verify('장착 응답이 200 이다', 응답.status(), 200);
      const 지금 = await 가방(admin, 나!);
      const 검 = 지금.items.find((x) => x.id === 짧은검);
      await verify('롱 소드를 장착하면 짧은 검의 장착이 풀린다', 검?.equippedSlot, null);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
