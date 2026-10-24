import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새아이템주기, 새캐릭터, 장착, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 장비해제 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-048',
  name: '장착한 롱 소드를 해제하면 공격력이 전사 기본값 12 로 돌아간다',
  platforms: ['android'],
  precondition: ['+2 롱 소드를 장착한 새 전사가 있다'],
  techniques: ['상태 전이'],
  elements: ['item:sword_long', 'class:Warrior'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  let 검 = 0;
  try {
    await test.step('+2 롱 소드를 장착한 새 전사를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa048', 'Warrior');
      검 = (await 새아이템주기(admin, 나, 'sword_long', { 강화: 2 })).id;
      await 장착(admin, 나, 검);
    });

    await test.step('가방에 +2 롱 소드가 장착돼 있는지 확인한다', async () => {
      const 그검 = (await 가방(admin, 나!)).items.find((x) => x.id === 검);
      const 강화 = await verify('가방의 롱 소드가 +2 다', 그검?.enhanceLevel, 2, { blocker: true });
      const 장착됨 = await verify('가방의 롱 소드가 장착돼 있다', 그검 !== undefined && 그검.equippedSlot !== null, true, { blocker: true });
      await verify('+2 롱 소드가 장착돼 있다', 강화 && 장착됨, true, { blocker: true });
    });

    await test.step('롱 소드를 해제한다', async () => {
      await 장비해제(admin, 나!, 검);
      const 읽음 = await 캐릭터읽기(admin, 나!);
      await verify('장착한 롱 소드를 해제하면 공격력이 전사 기본값 12 로 돌아간다', 읽음.stats.attack, 12);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
