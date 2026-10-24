import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 찾기, type 캐릭터 } from './helpers/api.helper.js';
import { 새캐릭터, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 강화요청, 오류코드 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-177',
  name: '롱 소드에 방어구 강화 주문서를 쓰면 409 「SCROLL_MISMATCH」다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 롱 소드와 방어구 강화 주문서를 가지고 있다'],
  techniques: ['동등 분할'],
  elements: ['item:sword_long', 'item:scroll_armor'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터에게 롱 소드와 방어구 강화 주문서를 준다', async () => {
      누구 = await 새캐릭터(admin, 'qafn177');
      await 아이템주기(admin, 누구, 'sword_long');
      await 아이템주기(admin, 누구, 'scroll_armor');
    });
    await test.step('롱 소드와 방어구 강화 주문서가 있는지 확인한다', async () => {
      const 가방값 = await 가방받기(request, 누구!);
      await verify('가방에 롱 소드가 있다', 찾기(가방값, 'sword_long') !== undefined, true, { blocker: true });
      await verify('가방에 방어구 강화 주문서가 있다', 찾기(가방값, 'scroll_armor') !== undefined, true, { blocker: true });
    });
    await test.step('롱 소드에 방어구 강화 주문서를 쓴다', async () => {
      const 가방값 = await 가방받기(request, 누구!);
      const 응답 = await 강화요청(request, 누구!, 찾기(가방값, 'sword_long')!.id, 찾기(가방값, 'scroll_armor')!.id);
      const 상태 = await verify('강화 응답 코드가 409 이다', 응답.status(), 409);
      const 코드 = await verify('강화 오류 코드가 「SCROLL_MISMATCH」이다', await 오류코드(응답), 'SCROLL_MISMATCH');
      await verify('롱 소드에 방어구 강화 주문서를 쓰면 409 「SCROLL_MISMATCH」다', 상태 && 코드, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
