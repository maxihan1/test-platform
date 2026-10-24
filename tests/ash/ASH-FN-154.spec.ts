import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 본문, 찾기, type 캐릭터, 해제하기 } from './helpers/api.helper.js';
import { 새캐릭터, 성향주기, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 판매하기 } from './helpers/shop.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-154',
  name: '악명 캐릭터가 짧은 검을 팔아도 판매가 100 골드를 받는다',
  platforms: ['android'],
  precondition: ['성향치 −1 인 새 전사 캐릭터가 짧은 검을 해제해 두었다'],
  elements: ['item:sword_short', 'state:성향=악명', 'flow:골드-상점판매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('성향치 −1 인 새 전사 캐릭터를 만들고 짧은 검을 해제한다', async () => {
      누구 = await 새캐릭터(admin, 'qafn154');
      await 성향주기(admin, 누구, -1);
      await 본문(await 해제하기(request, 누구, 찾기(await 가방받기(request, 누구), 'sword_short')!.id), '짧은 검 해제');
    });
    await test.step('성향치와 짧은 검 해제를 확인한다', async () => {
      await verify('새 캐릭터의 성향치가 −1 이다', (await 캐릭터읽기(admin, 누구!)).alignment.value, -1, { blocker: true });
      await verify('짧은 검이 장착되지 않았다', 찾기(await 가방받기(request, 누구!), 'sword_short')?.equippedSlot, null, { blocker: true });
    });
    await test.step('짧은 검을 판다', async () => {
      const 전 = (await 캐릭터읽기(admin, 누구!)).gold;
      const 응답 = await 판매하기(request, 누구!, 찾기(await 가방받기(request, 누구!), 'sword_short')!.id);
      const 팔렸다 = await verify('판매 응답이 성공이다', 응답.ok(), true);
      const 받은골드 = await verify('받은 골드가 100 이다', (await 캐릭터읽기(admin, 누구!)).gold - 전, 100);
      await verify('악명 캐릭터가 짧은 검을 팔아도 판매가 100 골드를 받는다', 팔렸다 && 받은골드, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
