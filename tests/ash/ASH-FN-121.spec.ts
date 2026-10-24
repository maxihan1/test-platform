import { defineCase, test, verify } from '@platform/kit';

import { 가방, 계정지우기, 새계정, 캐릭터더하기, type 계정 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-121',
  name: '직업마다 새 캐릭터를 만들면 직업 기본 무기와 가죽 갑옷을 장착하고 있다',
  platforms: ['android'],
  precondition: ['로그인한 계정이 있다'],
  elements: ['class:Warrior', 'class:Archer', 'class:Mage', 'item:sword_short', 'item:bow_short', 'item:staff_oak', 'item:armor_leather'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 주인: 계정 | undefined;
  try {
    await test.step('로그인한 계정을 만든다', async () => {
      주인 = await 새계정(admin, 'zqa121');
    });

    await test.step('로그인한 계정이 있는지 확인한다', async () => {
      const 응답 = await admin.get('/characters', { headers: { authorization: `Bearer ${주인!.토큰}` } });
      await verify('로그인한 계정이 있다', 응답.status(), 200, { blocker: true });
    });

    await test.step('직업마다 새 캐릭터를 만들고 가방을 읽는다', async () => {
      const 전사 = await 캐릭터더하기(admin, 주인!, 'Warrior');
      const 전사장비 = (await 가방(admin, 전사)).items
        .filter((x) => x.equippedSlot !== null)
        .map((x) => x.templateId)
        .sort()
        .join(', ');
      const 전사맞음 = await verify('전사가 짧은 검과 가죽 갑옷을 장착하고 있다', 전사장비, 'armor_leather, sword_short');

      const 궁수 = await 캐릭터더하기(admin, 주인!, 'Archer');
      const 궁수장비 = (await 가방(admin, 궁수)).items
        .filter((x) => x.equippedSlot !== null)
        .map((x) => x.templateId)
        .sort()
        .join(', ');
      const 궁수맞음 = await verify('궁수가 숏 보우와 가죽 갑옷을 장착하고 있다', 궁수장비, 'armor_leather, bow_short');

      const 마법사 = await 캐릭터더하기(admin, 주인!, 'Mage');
      const 마법사장비 = (await 가방(admin, 마법사)).items
        .filter((x) => x.equippedSlot !== null)
        .map((x) => x.templateId)
        .sort()
        .join(', ');
      const 마법사맞음 = await verify('마법사가 참나무 지팡이와 가죽 갑옷을 장착하고 있다', 마법사장비, 'armor_leather, staff_oak');

      await verify('직업마다 새 캐릭터를 만들면 직업 기본 무기와 가죽 갑옷을 장착하고 있다', 전사맞음 && 궁수맞음 && 마법사맞음, true);
    });
  } finally {
    if (주인 !== undefined) await 계정지우기(admin, 주인);
  }
});
