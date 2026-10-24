import { defineCase, test, verify } from '@platform/kit';

import { 강화하기, 결과고정읽기, 새캐릭터자리, 아이템번호 } from './helpers/admin.helper.js';
import { 찾기, type 캐릭터 } from './helpers/api.helper.js';
import { 가방읽기, 결과고정, 결과고정비우기, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-550',
  name: '안전 구간 강화는 파괴로 고정돼 있어도 성공하고 고정 결과가 남아 있다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 +0 롱 소드와 주문서를 가지고 있고 강화 결과가 파괴로 고정돼 있다'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'rate:enhance_1-3'],
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
      누구 = await 새캐릭터자리(admin, 'qafn550');
    });
    await test.step('새 전사 캐릭터에게 +0 롱 소드와 주문서를 준다', async () => {
      await 아이템주기(admin, 누구!, 'sword_long');
      await 아이템주기(admin, 누구!, 'scroll_weapon');
    });
    await test.step('강화 결과를 파괴로 고정한다', async () => {
      await 결과고정(admin, { enhance: ['Destroy'] });
    });
    await test.step('새 전사 캐릭터가 가진 것과 고정된 결과를 확인한다', async () => {
      const 가방값 = await 가방읽기(admin, 누구!);
      await verify('새 전사 캐릭터가 +0 롱 소드와 주문서를 가지고 있다', 찾기(가방값, 'sword_long')?.enhanceLevel === 0 && 찾기(가방값, 'scroll_weapon') !== undefined, true, {
        blocker: true,
      });
      await verify('강화 결과가 파괴로 고정돼 있다', (await 결과고정읽기(admin)).enhance.join(', '), 'Destroy', { blocker: true });
    });
    await test.step('+0 롱 소드를 강화한다', async () => {
      const 나 = 누구!;
      const 가방값 = await 가방읽기(admin, 나);
      const 강화 = await 강화하기(request, 나, 아이템번호(가방값, 'sword_long'), 아이템번호(가방값, 'scroll_weapon'));
      const 성공 = await verify('강화 결과가 성공이다', 강화.result, 'Success');
      const 남음 = await verify('고정 결과가 파괴로 남아 있다', (await 결과고정읽기(admin)).enhance.join(', '), 'Destroy');
      await verify('안전 구간 강화는 파괴로 고정돼 있어도 성공하고 고정 결과가 남아 있다', 성공 && 남음, true);
    });
  } finally {
    await 결과고정비우기(admin);
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
