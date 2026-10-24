import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 찾기, type 캐릭터 } from './helpers/api.helper.js';
import { 가방읽기, 새캐릭터, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-112',
  name: '+1 숏 보우의 판매가는 105 × 1.5 를 버린 157 이다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 +1 숏 보우를 가지고 있다'],
  elements: ['item:bow_short'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만들고 +1 숏 보우를 준다', async () => {
      누구 = await 새캐릭터(admin, 'qafn112');
      await 아이템주기(admin, 누구, 'bow_short', { 강화: 1 });
    });
    await test.step('가방에 +1 숏 보우가 있는지 확인한다', async () => {
      await verify('가방의 숏 보우가 +1 이다', 찾기(await 가방읽기(admin, 누구!), 'bow_short')?.enhanceLevel, 1, { blocker: true });
    });
    await test.step('가방을 받아 +1 숏 보우의 판매가를 읽는다', async () => {
      const 가방값 = await 가방받기(request, 누구!);
      await verify('+1 숏 보우의 판매가는 105 × 1.5 를 버린 157 이다', 찾기(가방값, 'bow_short')?.sellPrice, 157);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
