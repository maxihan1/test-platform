import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 본문, 찾기, type 캐릭터 } from './helpers/api.helper.js';
import { 새캐릭터, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 강화요청, type 강화응답 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-175',
  name: '롱 소드에 무기 강화 주문서를 쓰면 강화가 된다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 롱 소드와 무기 강화 주문서를 가지고 있다', '새 전사 캐릭터가 사슬 갑옷과 방어구 강화 주문서를 가지고 있다'],
  elements: ['item:sword_long', 'item:scroll_weapon', 'item:armor_chain', 'item:scroll_armor', 'flow:골드-강화'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터에게 롱 소드 · 사슬 갑옷과 두 가지 강화 주문서를 준다', async () => {
      누구 = await 새캐릭터(admin, 'qafn175');
      await 아이템주기(admin, 누구, 'sword_long');
      await 아이템주기(admin, 누구, 'armor_chain');
      await 아이템주기(admin, 누구, 'scroll_weapon');
      await 아이템주기(admin, 누구, 'scroll_armor');
    });
    await test.step('롱 소드 · 사슬 갑옷과 두 가지 강화 주문서가 있는지 확인한다', async () => {
      const 가방값 = await 가방받기(request, 누구!);
      await verify('가방에 롱 소드가 있다', 찾기(가방값, 'sword_long') !== undefined, true, { blocker: true });
      await verify('가방에 무기 강화 주문서가 있다', 찾기(가방값, 'scroll_weapon') !== undefined, true, { blocker: true });
      await verify('가방에 사슬 갑옷이 있다', 찾기(가방값, 'armor_chain') !== undefined, true, { blocker: true });
      await verify('가방에 방어구 강화 주문서가 있다', 찾기(가방값, 'scroll_armor') !== undefined, true, { blocker: true });
    });
    await test.step('롱 소드에 무기 강화 주문서를 쓴다', async () => {
      const 가방값 = await 가방받기(request, 누구!);
      const 응답 = await 본문<강화응답>(await 강화요청(request, 누구!, 찾기(가방값, 'sword_long')!.id, 찾기(가방값, 'scroll_weapon')!.id), '롱 소드 강화');
      const 성공 = await verify('롱 소드 강화 결과가 성공이다', 응답.result, 'Success');
      const 한단계 = await verify('롱 소드가 +1 이 된다', 응답.toLevel, 1);
      await verify('롱 소드에 무기 강화 주문서를 쓰면 강화가 된다', 성공 && 한단계, true);
    });
    await test.step('사슬 갑옷에 방어구 강화 주문서를 쓴다', async () => {
      const 가방값 = await 가방받기(request, 누구!);
      const 응답 = await 본문<강화응답>(await 강화요청(request, 누구!, 찾기(가방값, 'armor_chain')!.id, 찾기(가방값, 'scroll_armor')!.id), '사슬 갑옷 강화');
      const 성공 = await verify('사슬 갑옷 강화 결과가 성공이다', 응답.result, 'Success');
      const 한단계 = await verify('사슬 갑옷이 +1 이 된다', 응답.toLevel, 1);
      await verify('사슬 갑옷에 방어구 강화 주문서를 쓰면 강화가 된다', 성공 && 한단계, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
