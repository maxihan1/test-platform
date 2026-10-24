import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새아이템주기, 새캐릭터, 장착, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-046',
  name: '+2 롱 소드를 장착하면 공격력이 전사 기본값 12 + 14 + 4 인 30 이다',
  platforms: ['android'],
  precondition: ['+2 롱 소드를 가진 새 전사가 있다'],
  elements: ['item:sword_long', 'class:Warrior'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 검 = 0;
  try {
    await test.step('+2 롱 소드를 가진 새 전사를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa046', 'Warrior');
      검 = (await 새아이템주기(admin, 나, 'sword_long', { 강화: 2 })).id;
    });

    await test.step('가방에 +2 롱 소드가 있는지 확인한다', async () => {
      const 그검 = (await 가방(admin, 나!)).items.find((x) => x.id === 검);
      await verify('가방에 +2 롱 소드가 있다', 그검?.enhanceLevel, 2, { blocker: true });
    });

    await test.step('+2 롱 소드를 장착한다', async () => {
      await 장착(admin, 나!, 검);
      const 읽음 = await 캐릭터읽기(admin, 나!);
      await verify('+2 롱 소드를 장착하면 공격력이 전사 기본값 12 + 14 + 4 인 30 이다', 읽음.stats.attack, 30);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
