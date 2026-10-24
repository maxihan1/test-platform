import { defineCase, test, verify } from '@platform/kit';

import { 머리, 오류, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 골드주기, 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-342',
  name: '오류가 나면 본문이 code · message 두 칸으로 온다',
  platforms: ['android'],
  precondition: ['골드 0 인 새 전사 캐릭터가 있다'],
  techniques: ['동등 분할'],
  elements: ['flow:골드-상점구매', 'item:potion_hp_s'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('골드 0 인 새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn342');
      await 골드주기(admin, 누구, 0);
    });
    await test.step('새 전사 캐릭터의 골드가 0 인지 확인한다', async () => {
      await verify('새 전사 캐릭터의 골드가 0 이다', (await 캐릭터정보받기(request, 누구!)).gold, 0, { blocker: true });
    });
    await test.step('빨간 물약을 사서 오류 본문을 읽는다', async () => {
      const 응답 = await request.post('/shop/buy', { headers: 머리(누구!), data: { templateId: 'potion_hp_s', quantity: 1 } });
      const 본문값 = await 오류<Record<string, unknown>>(응답);
      const 오류남 = await verify('구매가 오류로 끝난다', 응답.ok(), false);
      const 두칸 = await verify('본문의 칸이 code, message 둘이다', Object.keys(본문값).sort().join(', '), 'code, message');
      await verify('오류가 나면 본문이 code · message 두 칸으로 온다', 오류남 && 두칸, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
