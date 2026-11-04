import { defineCase, test, verify } from '@platform/kit';

import { GM아이템, 가방읽기, 장착, 템플릿찾기, 플레이어만들기, type 아이템, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-100',
  name: '같은 부위 장비를 장착하면 앞 장비의 「equippedSlot」이 비워진다',
  apiDoc: 1,
  precondition: ['짧은 검을 장착한 전사가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 짧은검: 아이템 | undefined;
  let 롱소드: 아이템 | undefined;

  await test.step('일회용 계정으로 전사를 만들고 GM 으로 롱 소드를 받는다', async () => {
    나 = await 플레이어만들기(request, 'Warrior');
    await GM아이템(request, 나, 'sword_long');
  });

  await test.step('짧은 검을 장착한 전사와 받은 롱 소드를 확인한다', async () => {
    const 지금 = await 가방읽기(request, 나);
    짧은검 = 템플릿찾기(지금, 'sword_short');
    롱소드 = 템플릿찾기(지금, 'sword_long');
    await verify('짧은 검이 「Weapon」 부위에 장착돼 있다', 짧은검?.equippedSlot, 'Weapon', { blocker: true });
    await verify('받은 롱 소드가 가방에 있다', 롱소드 !== undefined, true, {
      blocker: true,
    });
  });

  await test.step('GM 으로 받은 롱 소드를 장착한다', async () => {
    if (짧은검 === undefined || 롱소드 === undefined) return;
    await 장착(request, 나, 롱소드.id);
    const 지금 = await 가방읽기(request, 나);
    const 앞장비 = 지금.items.find((i) => i.id === 짧은검?.id);
    const 새장비 = 지금.items.find((i) => i.id === 롱소드?.id);
    await verify('같은 부위 장비를 장착하면 앞 장비의 「equippedSlot」이 비워진다', 앞장비?.equippedSlot, null);
    await verify('같은 부위 장비를 장착하면 새 장비의 「equippedSlot」이 「Weapon」이다', 새장비?.equippedSlot, 'Weapon');
  });
});
