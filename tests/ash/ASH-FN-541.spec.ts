import { defineCase, test, verify } from '@platform/kit';

import { 목록글, 새캐릭터자리 } from './helpers/admin.helper.js';
import { 본문, type 캐릭터, type 캐릭터정보 } from './helpers/api.helper.js';
import { 가방읽기, 캐릭터바꾸기, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-541',
  name: '어드민 초기화를 하면 레벨 1 · 골드 500 · 시작 장비 · 성향 0 · 하늘빛 마을로 돌아간다',
  platforms: ['android'],
  precondition: ['레벨 9 · 골드 9,999 · 성향치 −400 인 새 전사 캐릭터가 초록 들판에 있다'],
  elements: ['zone:Town', 'zone:Beginner', 'item:sword_short', 'item:armor_leather'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn541', 'Beginner');
    });
    await test.step('새 전사 캐릭터의 레벨 · 골드 · 성향치를 바꿔 둔다', async () => {
      await 캐릭터바꾸기(admin, 누구!, { level: 9, gold: 9999, alignment: -400 });
    });
    await test.step('새 전사 캐릭터의 상태를 확인한다', async () => {
      const 정보 = await 캐릭터읽기(admin, 누구!);
      await verify('캐릭터가 레벨 9 다', 정보.level, 9, { blocker: true });
      await verify('캐릭터가 골드 9,999 다', 정보.gold, 9999, { blocker: true });
      await verify('캐릭터가 성향치 −400 이다', 정보.alignment.value, -400, { blocker: true });
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
    });
    await test.step('어드민으로 캐릭터를 초기화한다', async () => {
      const 나 = 누구!;
      const 후 = await 본문<캐릭터정보>(await admin.post(`/admin/characters/${String(나.번호)}/reset`), '캐릭터 초기화');
      const 장비 = (await 가방읽기(admin, 나)).items.filter((i) => i.equippedSlot !== null).map((i) => `${i.templateId}:${String(i.equippedSlot)}`);
      const 레벨 = await verify('레벨이 1 이다', 후.level, 1);
      const 골드 = await verify('골드가 500 이다', 후.gold, 500);
      const 시작장비 = await verify('장착한 장비가 시작 장비다', 목록글(...장비), 목록글('sword_short:Weapon', 'armor_leather:Armor'));
      const 성향 = await verify('성향치가 0 이다', 후.alignment.value, 0);
      const 마을 = await verify('하늘빛 마을로 돌아간다', 후.zone, 'Town');
      await verify('어드민 초기화를 하면 레벨 1 · 골드 500 · 시작 장비 · 성향 0 · 하늘빛 마을로 돌아간다', 레벨 && 골드 && 시작장비 && 성향 && 마을, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
