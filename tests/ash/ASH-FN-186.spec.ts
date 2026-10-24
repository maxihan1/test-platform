import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 본문, 장착하기, 찾기, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 결과고정, 결과고정비우기, 설정읽기, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 강화요청, type 강화응답, 새골드캐릭터 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-186',
  name: '장착한 롱 소드가 파괴되면 무기 칸이 비고 공격력이 직업 기본값 12 가 된다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 +3 롱 소드를 장착하고 있고 강화 결과가 파괴로 고정돼 있다'],
  techniques: ['상태 전이'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'class:Warrior', 'rate:enhance_4', 'flow:골드-강화'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터에게 +3 롱 소드를 장착시키고 무기 강화 주문서를 준다', async () => {
      누구 = await 새골드캐릭터(admin, 'qafn186', 10_000);
      const 칼 = 찾기(await 아이템주기(admin, 누구, 'sword_long', { 강화: 3 }), 'sword_long');
      await 아이템주기(admin, 누구, 'scroll_weapon');
      await 본문(await 장착하기(request, 누구, 칼!.id), '롱 소드 장착');
    });
    await test.step('강화 결과를 파괴로 고정한다', async () => {
      await 결과고정비우기(admin);
      await 결과고정(admin, { enhance: ['Destroy'] });
    });
    await test.step('+3 롱 소드 장착과 파괴 고정을 확인한다', async () => {
      const 칼 = 찾기(await 가방받기(request, 누구!), 'sword_long');
      await verify('롱 소드가 +3 이다', 칼?.enhanceLevel, 3, { blocker: true });
      await verify('롱 소드가 무기 칸에 장착돼 있다', 칼?.equippedSlot, 'Weapon', { blocker: true });
      await verify('강화 결과가 파괴로 고정돼 있다', (await 설정읽기(admin)).forced.enhance, ['Destroy'], { blocker: true });
    });
    await test.step('장착한 +3 롱 소드를 강화한다', async () => {
      const 가방값 = await 가방받기(request, 누구!);
      await 본문<강화응답>(await 강화요청(request, 누구!, 찾기(가방값, 'sword_long')!.id, 찾기(가방값, 'scroll_weapon')!.id), '장착한 롱 소드 강화');
      const 후 = await 가방받기(request, 누구!);
      const 비었다 = await verify('무기 칸에 장착한 아이템이 없다', 후.items.some((i) => i.equippedSlot === 'Weapon'), false);
      const 공격력 = await verify('캐릭터의 공격력이 12 이다', (await 캐릭터정보받기(request, 누구!)).stats.attack, 12);
      await verify('장착한 롱 소드가 파괴되면 무기 칸이 비고 공격력이 직업 기본값 12 가 된다', 비었다 && 공격력, true);
    });
  } finally {
    await 결과고정비우기(admin);
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
