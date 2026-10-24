import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 본문, 찾기, type 캐릭터, 해제하기 } from './helpers/api.helper.js';
import { 새캐릭터, 성향주기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-156',
  name: '성향치를 −1 로 바꿔도 짧은 검의 판매가가 100 그대로다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 짧은 검을 해제해 두었다'],
  techniques: ['상태 전이'],
  elements: ['item:sword_short', 'state:성향=악명'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만들고 짧은 검을 해제한다', async () => {
      누구 = await 새캐릭터(admin, 'qafn156');
      await 본문(await 해제하기(request, 누구, 찾기(await 가방받기(request, 누구), 'sword_short')!.id), '짧은 검 해제');
    });
    await test.step('짧은 검 해제를 확인한다', async () => {
      await verify('짧은 검이 장착되지 않았다', 찾기(await 가방받기(request, 누구!), 'sword_short')?.equippedSlot, null, { blocker: true });
    });
    await test.step('성향치를 −1 로 바꾸고 가방을 받는다', async () => {
      await 성향주기(admin, 누구!, -1);
      await verify('성향치를 −1 로 바꿔도 짧은 검의 판매가가 100 그대로다', 찾기(await 가방받기(request, 누구!), 'sword_short')?.sellPrice, 100);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
