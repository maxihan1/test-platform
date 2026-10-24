import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, 본문, 찾기, type 캐릭터, 해제하기 } from './helpers/api.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-130',
  name: '장착한 짧은 검을 해제해도 가방 사용 칸이 그대로다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 짧은 검을 장착하고 있다'],
  elements: ['item:sword_short'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn130');
    });
    await test.step('짧은 검이 장착돼 있는지 확인한다', async () => {
      await verify('짧은 검이 무기 칸에 장착돼 있다', 찾기(await 가방받기(request, 누구!), 'sword_short')?.equippedSlot, 'Weapon', { blocker: true });
    });
    await test.step('짧은 검을 해제하고 가방을 받는다', async () => {
      const 전 = await 가방받기(request, 누구!);
      await 본문(await 해제하기(request, 누구!, 찾기(전, 'sword_short')!.id), '짧은 검 해제');
      const 후 = await 가방받기(request, 누구!);
      await verify('장착한 짧은 검을 해제해도 가방 사용 칸이 그대로다', 후.used, 전.used);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
