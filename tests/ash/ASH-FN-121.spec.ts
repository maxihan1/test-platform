import { defineCase, test, verify } from '@platform/kit';

import { type 가방, 가방받기, type 계정, 새계정, 캐릭터만들기 } from './helpers/api.helper.js';
import { 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-121',
  name: '직업마다 새 캐릭터를 만들면 짧은 검 · 숏 보우 · 참나무 지팡이 가운데 제 직업 무기와 가죽 갑옷을 장착하고 있다',
  platforms: ['android'],
  precondition: ['새 계정이 있다'],
  elements: ['class:Warrior', 'class:Archer', 'class:Mage', 'item:sword_short', 'item:bow_short', 'item:staff_oak', 'item:armor_leather'],
  params: null,
  expected: null,
});

const 장착한것 = (가방값: 가방, 칸: string): string | undefined => 가방값.items.find((i) => i.equippedSlot === 칸)?.templateId;

test(spec, async ({ admin, request }) => {
  let 전사계정: 계정 | undefined;
  let 궁수계정: 계정 | undefined;
  let 마법사계정: 계정 | undefined;
  try {
    await test.step('직업마다 새 계정을 만든다', async () => {
      전사계정 = await 새계정(request, 'qafn121');
      궁수계정 = await 새계정(request, 'qafn121');
      마법사계정 = await 새계정(request, 'qafn121');
    });
    await test.step('새 계정 셋으로 로그인했는지 확인한다', async () => {
      const 받은수 = [전사계정, 궁수계정, 마법사계정].filter((c) => typeof c?.토큰 === 'string').length;
      await verify('토큰을 받은 새 계정이 셋이다', 받은수, 3, { blocker: true });
    });
    await test.step('직업마다 캐릭터를 만들고 가방을 받는다', async () => {
      const 전사 = await 가방받기(request, await 캐릭터만들기(request, 전사계정!, 'Warrior'));
      const 궁수 = await 가방받기(request, await 캐릭터만들기(request, 궁수계정!, 'Archer'));
      const 마법사 = await 가방받기(request, await 캐릭터만들기(request, 마법사계정!, 'Mage'));
      const 전사무기 = await verify('전사가 짧은 검을 장착하고 있다', 장착한것(전사, 'Weapon'), 'sword_short');
      const 궁수무기 = await verify('궁수가 숏 보우를 장착하고 있다', 장착한것(궁수, 'Weapon'), 'bow_short');
      const 마법사무기 = await verify('마법사가 참나무 지팡이를 장착하고 있다', 장착한것(마법사, 'Weapon'), 'staff_oak');
      const 전사갑옷 = await verify('전사가 가죽 갑옷을 장착하고 있다', 장착한것(전사, 'Armor'), 'armor_leather');
      const 궁수갑옷 = await verify('궁수가 가죽 갑옷을 장착하고 있다', 장착한것(궁수, 'Armor'), 'armor_leather');
      const 마법사갑옷 = await verify('마법사가 가죽 갑옷을 장착하고 있다', 장착한것(마법사, 'Armor'), 'armor_leather');
      await verify(
        '직업마다 새 캐릭터를 만들면 짧은 검 · 숏 보우 · 참나무 지팡이 가운데 제 직업 무기와 가죽 갑옷을 장착하고 있다',
        전사무기 && 궁수무기 && 마법사무기 && 전사갑옷 && 궁수갑옷 && 마법사갑옷,
        true,
      );
    });
  } finally {
    if (전사계정 !== undefined) await 캐릭터지우기(admin, 전사계정);
    if (궁수계정 !== undefined) await 캐릭터지우기(admin, 궁수계정);
    if (마법사계정 !== undefined) await 캐릭터지우기(admin, 마법사계정);
  }
});
