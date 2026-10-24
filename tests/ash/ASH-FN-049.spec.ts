import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 가방읽기, 새캐릭터, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 장착결과 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-049',
  name: '+3 롱 소드를 장착하면 +0 롱 소드보다 공격력이 6 높다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 +3 롱 소드를 가지고 있다'],
  elements: ['class:Warrior', 'item:sword_long'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터에게 +0 롱 소드와 +3 롱 소드를 준다', async () => {
      누구 = await 새캐릭터(admin, 'qafn049');
      await 아이템주기(admin, 누구, 'sword_long');
      await 아이템주기(admin, 누구, 'sword_long', { 강화: 3 });
    });
    await test.step('새 전사 캐릭터가 +3 롱 소드를 가지고 있는지 확인한다', async () => {
      const 속 = await 가방읽기(admin, 누구!);
      const 강한 = 속.items.find((i) => i.templateId === 'sword_long' && i.enhanceLevel === 3);
      await verify('새 전사 캐릭터가 +3 롱 소드를 가지고 있다', 강한?.enhanceLevel, 3, { blocker: true });
    });
    await test.step('+3 롱 소드를 장착하고 능력치를 받는다', async () => {
      const 나 = 누구!;
      const 속 = await 가방읽기(admin, 나);
      const 기본 = 속.items.find((i) => i.templateId === 'sword_long' && i.enhanceLevel === 0);
      const 강한 = 속.items.find((i) => i.templateId === 'sword_long' && i.enhanceLevel === 3);
      await 장착결과(request, 나, 기본!.id);
      const 기준 = (await 캐릭터정보받기(request, 나)).stats.attack;
      await 장착결과(request, 나, 강한!.id);
      const 정보 = await 캐릭터정보받기(request, 나);
      await verify('+3 롱 소드를 장착하면 +0 롱 소드보다 공격력이 6 높다', 정보.stats.attack - 기준, 6);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
