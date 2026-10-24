import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 가방읽기, 새캐릭터, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 장착결과 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-052',
  name: '+4 사슬 갑옷을 장착하면 +0 사슬 갑옷보다 방어력이 4 높다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 +4 사슬 갑옷을 가지고 있다'],
  elements: ['class:Warrior', 'item:armor_chain'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터에게 +0 사슬 갑옷과 +4 사슬 갑옷을 준다', async () => {
      누구 = await 새캐릭터(admin, 'qafn052');
      await 아이템주기(admin, 누구, 'armor_chain');
      await 아이템주기(admin, 누구, 'armor_chain', { 강화: 4 });
    });
    await test.step('새 전사 캐릭터가 +4 사슬 갑옷을 가지고 있는지 확인한다', async () => {
      const 속 = await 가방읽기(admin, 누구!);
      const 강한 = 속.items.find((i) => i.templateId === 'armor_chain' && i.enhanceLevel === 4);
      await verify('새 전사 캐릭터가 +4 사슬 갑옷을 가지고 있다', 강한?.enhanceLevel, 4, { blocker: true });
    });
    await test.step('+4 사슬 갑옷을 장착하고 능력치를 받는다', async () => {
      const 나 = 누구!;
      const 속 = await 가방읽기(admin, 나);
      const 기본 = 속.items.find((i) => i.templateId === 'armor_chain' && i.enhanceLevel === 0);
      const 강한 = 속.items.find((i) => i.templateId === 'armor_chain' && i.enhanceLevel === 4);
      await 장착결과(request, 나, 기본!.id);
      const 기준 = (await 캐릭터정보받기(request, 나)).stats.defense;
      await 장착결과(request, 나, 강한!.id);
      const 정보 = await 캐릭터정보받기(request, 나);
      await verify('+4 사슬 갑옷을 장착하면 +0 사슬 갑옷보다 방어력이 4 높다', 정보.stats.defense - 기준, 4);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
