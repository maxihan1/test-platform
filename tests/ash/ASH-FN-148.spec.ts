import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 본문, 찾기, type 캐릭터, 해제하기 } from './helpers/api.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 판매하기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-148',
  name: '짧은 검을 해제한 뒤 팔면 팔린다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 짧은 검을 장착하고 있다'],
  elements: ['item:sword_short', 'flow:골드-상점판매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn148');
    });
    await test.step('짧은 검이 장착돼 있는지 확인한다', async () => {
      await verify('짧은 검이 무기 칸에 장착돼 있다', 찾기(await 가방받기(request, 누구!), 'sword_short')?.equippedSlot, 'Weapon', { blocker: true });
    });
    await test.step('짧은 검을 해제한 뒤 판다', async () => {
      const 칼번호 = 찾기(await 가방받기(request, 누구!), 'sword_short')!.id;
      await 본문(await 해제하기(request, 누구!, 칼번호), '짧은 검 해제');
      const 응답 = await 판매하기(request, 누구!, 칼번호);
      const 팔림 = await verify('판매 응답이 성공이다', 응답.ok(), true);
      const 사라짐 = await verify('가방에서 판 짧은 검이 사라진다', (await 가방받기(request, 누구!)).items.some((i) => i.id === 칼번호), false);
      await verify('짧은 검을 해제한 뒤 팔면 팔린다', 팔림 && 사라짐, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
