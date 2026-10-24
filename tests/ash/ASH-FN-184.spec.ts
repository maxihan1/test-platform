import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 개수, 본문, type 캐릭터 } from './helpers/api.helper.js';
import { 결과고정, 결과고정비우기, 설정읽기, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 강화요청, type 강화응답, 새골드캐릭터 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-184',
  name: '강화 결과가 성공이면 롱 소드가 +3 에서 +4 가 된다',
  platforms: ['android'],
  precondition: [
    '새 전사 캐릭터가 +3 롱 소드와 무기 강화 주문서를 가지고 있고 강화 결과가 성공으로 고정돼 있다',
    '새 전사 캐릭터가 +3 롱 소드와 무기 강화 주문서를 가지고 있고 강화 결과가 실패로 고정돼 있다',
    '새 전사 캐릭터가 +3 롱 소드와 무기 강화 주문서를 가지고 있고 강화 결과가 파괴로 고정돼 있다',
  ],
  elements: ['item:sword_long', 'item:scroll_weapon', 'rate:enhance_4', 'flow:골드-강화'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터에게 +3 롱 소드 셋과 무기 강화 주문서를 준다', async () => {
      누구 = await 새골드캐릭터(admin, 'qafn184', 10_000);
      for (let 번 = 0; 번 < 3; 번 += 1) await 아이템주기(admin, 누구, 'sword_long', { 강화: 3 });
      await 아이템주기(admin, 누구, 'scroll_weapon', { 수량: 3 });
    });
    await test.step('강화 결과를 성공 · 실패 · 파괴 차례로 고정한다', async () => {
      await 결과고정비우기(admin);
      await 결과고정(admin, { enhance: ['Success', 'Fail', 'Destroy'] });
    });
    await test.step('+3 롱 소드 셋과 무기 강화 주문서, 고정한 차례를 확인한다', async () => {
      const 가방값 = await 가방받기(request, 누구!);
      const 칼들 = 가방값.items.filter((i) => i.templateId === 'sword_long' && i.enhanceLevel === 3);
      await verify('가방에 +3 롱 소드가 셋 있다', 칼들.length, 3, { blocker: true });
      await verify('가방에 무기 강화 주문서가 3장 있다', 개수(가방값, 'scroll_weapon'), 3, { blocker: true });
      await verify('강화 결과가 성공 · 실패 · 파괴 차례로 고정돼 있다', (await 설정읽기(admin)).forced.enhance, ['Success', 'Fail', 'Destroy'], { blocker: true });
    });
    await test.step('+3 롱 소드를 강화한다', async () => {
      const 가방값 = await 가방받기(request, 누구!);
      const 칼들 = 가방값.items.filter((i) => i.templateId === 'sword_long').map((i) => i.id).sort((a, b) => a - b);
      const 주문서 = 가방값.items.find((i) => i.templateId === 'scroll_weapon')!.id;
      const 성공 = await 본문<강화응답>(await 강화요청(request, 누구!, 칼들[0]!, 주문서), '성공 고정 강화');
      await verify('강화 결과가 성공이면 롱 소드가 +3 에서 +4 가 된다', 성공.toLevel, 4);
      const 실패 = await 본문<강화응답>(await 강화요청(request, 누구!, 칼들[1]!, 주문서), '실패 고정 강화');
      await verify('강화 결과가 실패면 롱 소드가 +3 그대로다', 실패.toLevel, 3);
      await 본문<강화응답>(await 강화요청(request, 누구!, 칼들[2]!, 주문서), '파괴 고정 강화');
      const 남은 = (await 가방받기(request, 누구!)).items.some((i) => i.id === 칼들[2]);
      await verify('강화 결과가 파괴면 롱 소드가 가방에서 사라진다', 남은, false);
    });
  } finally {
    await 결과고정비우기(admin);
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
