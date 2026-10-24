import { defineCase, test, verify } from '@platform/kit';

import { 강화하기, 결과고정읽기, 새캐릭터자리, 아이템번호 } from './helpers/admin.helper.js';
import { 개수, type 캐릭터 } from './helpers/api.helper.js';
import { 가방읽기, 결과고정, 결과고정비우기, 골드주기, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-547',
  name: '실패 · 성공 차례로 고정하면 강화 결과가 그 차례대로 나온다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 +4 롱 소드 두 자루와 주문서를 가지고 있고 강화 결과가 실패 · 성공 차례로 고정돼 있다'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'rate:enhance_5'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('이전 실행이 남긴 고정 결과를 비운다', async () => {
      await 결과고정비우기(admin);
    });
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn547');
    });
    await test.step('새 전사 캐릭터에게 +4 롱 소드 두 자루와 주문서를 준다', async () => {
      await 아이템주기(admin, 누구!, 'sword_long', { 강화: 4 });
      await 아이템주기(admin, 누구!, 'sword_long', { 강화: 4 });
      await 아이템주기(admin, 누구!, 'scroll_weapon', { 수량: 2 });
      await 골드주기(admin, 누구!, 3000);
    });
    await test.step('강화 결과를 실패 · 성공 차례로 고정한다', async () => {
      await 결과고정(admin, { enhance: ['Fail', 'Success'] });
    });
    await test.step('새 전사 캐릭터가 가진 것과 고정된 결과를 확인한다', async () => {
      const 가방값 = await 가방읽기(admin, 누구!);
      const 강한검 = 가방값.items.filter((i) => i.templateId === 'sword_long' && i.enhanceLevel === 4).length;
      await verify('새 전사 캐릭터가 +4 롱 소드 두 자루를 가지고 있다', 강한검, 2, { blocker: true });
      await verify('새 전사 캐릭터가 주문서를 가지고 있다', 개수(가방값, 'scroll_weapon'), 2, { blocker: true });
      await verify('강화 결과가 실패 · 성공 차례로 고정돼 있다', (await 결과고정읽기(admin)).enhance.join(', '), 'Fail, Success', { blocker: true });
    });
    await test.step('+4 롱 소드 두 자루를 차례로 강화한다', async () => {
      const 나 = 누구!;
      const 가방값 = await 가방읽기(admin, 나);
      const 검들 = 가방값.items.filter((i) => i.templateId === 'sword_long' && i.enhanceLevel === 4);
      const 주문서 = 아이템번호(가방값, 'scroll_weapon');
      const 첫째 = await 강화하기(request, 나, 검들[0]!.id, 주문서);
      const 둘째 = await 강화하기(request, 나, 검들[1]!.id, 주문서);
      await verify('실패 · 성공 차례로 고정하면 강화 결과가 그 차례대로 나온다', `${첫째.result}, ${둘째.result}`, 'Fail, Success');
    });
  } finally {
    await 결과고정비우기(admin);
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
