import { defineCase, test, verify } from '@platform/kit';

import { 새캐릭터자리, 아이템번호, type 장비응답 } from './helpers/admin.helper.js';
import { 본문, 장착하기, 찾기, type 캐릭터 } from './helpers/api.helper.js';
import { 가방읽기, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-427',
  name: '같은 무기 칸에 롱 소드를 장착하면 짧은 검이 자동으로 해제된다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 짧은 검을 장착하고 롱 소드를 가지고 있다'],
  elements: ['item:sword_short', 'item:sword_long'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn427');
    });
    await test.step('새 전사 캐릭터에게 롱 소드를 준다', async () => {
      await 아이템주기(admin, 누구!, 'sword_long');
    });
    await test.step('짧은 검의 장착과 롱 소드의 보유를 확인한다', async () => {
      const 가방값 = await 가방읽기(admin, 누구!);
      await verify('새 전사 캐릭터가 짧은 검을 장착하고 있다', 찾기(가방값, 'sword_short')?.equippedSlot, 'Weapon', { blocker: true });
      await verify('새 전사 캐릭터가 롱 소드를 가지고 있다', 찾기(가방값, 'sword_long') !== undefined, true, { blocker: true });
    });
    await test.step('롱 소드를 장착한다', async () => {
      const 나 = 누구!;
      const 응답 = await 본문<장비응답>(await 장착하기(request, 나, 아이템번호(await 가방읽기(admin, 나), 'sword_long')), '장착');
      const 롱 = await verify('롱 소드의 장착 칸이 Weapon 이다', 찾기(응답.inventory, 'sword_long')?.equippedSlot, 'Weapon');
      const 짧은 = await verify('짧은 검의 장착 칸이 비어 있다', 찾기(응답.inventory, 'sword_short')?.equippedSlot, null);
      await verify('같은 무기 칸에 롱 소드를 장착하면 짧은 검이 자동으로 해제된다', 롱 && 짧은, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
