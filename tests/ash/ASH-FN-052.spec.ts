import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새아이템주기, 새캐릭터, 장착, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-052',
  name: '+3 가죽 갑옷을 장착하면 방어력이 +0 가죽 갑옷일 때보다 3 높다',
  platforms: ['android'],
  precondition: ['+3 가죽 갑옷을 가진 새 전사가 있다'],
  elements: ['item:armor_leather', 'class:Warrior'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 갑옷 = 0;
  try {
    await test.step('+3 가죽 갑옷을 가진 새 전사를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa052', 'Warrior');
      갑옷 = (await 새아이템주기(admin, 나, 'armor_leather', { 강화: 3 })).id;
    });

    await test.step('가방에 +3 가죽 갑옷이 있고 +0 가죽 갑옷이 장착돼 있는지 확인한다', async () => {
      const 지금 = (await 가방(admin, 나!)).items;
      await verify('가방에 +3 가죽 갑옷이 있다', 지금.find((x) => x.id === 갑옷)?.enhanceLevel, 3, { blocker: true });
      await verify('+0 가죽 갑옷이 장착돼 있다', 지금.some((x) => x.templateId === 'armor_leather' && x.enhanceLevel === 0 && x.equippedSlot !== null), true, { blocker: true });
    });

    await test.step('+3 가죽 갑옷으로 바꿔 장착한다', async () => {
      const 전 = (await 캐릭터읽기(admin, 나!)).stats.defense;
      await 장착(admin, 나!, 갑옷);
      const 후 = (await 캐릭터읽기(admin, 나!)).stats.defense;
      await verify('+3 가죽 갑옷을 장착하면 방어력이 +0 가죽 갑옷일 때보다 3 높다', 후 - 전, 3);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
