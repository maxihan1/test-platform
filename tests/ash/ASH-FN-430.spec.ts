import { defineCase, test, verify } from '@platform/kit';

import { 목록글, 새캐릭터자리, 아이템번호, type 장비응답, 칸들 } from './helpers/admin.helper.js';
import { 본문, 찾기, type 캐릭터, 해제하기 } from './helpers/api.helper.js';
import { 가방읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-430',
  name: '장비를 해제하면 inventory · stats 가 오고 짧은 검의 장착 칸이 빈다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 짧은 검을 장착하고 있다'],
  elements: ['item:sword_short'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn430');
    });
    await test.step('짧은 검의 장착을 확인한다', async () => {
      await verify('새 전사 캐릭터가 짧은 검을 장착하고 있다', 찾기(await 가방읽기(admin, 누구!), 'sword_short')?.equippedSlot, 'Weapon', { blocker: true });
    });
    await test.step('짧은 검을 해제한다', async () => {
      const 나 = 누구!;
      const 응답 = await 본문<장비응답>(await 해제하기(request, 나, 아이템번호(await 가방읽기(admin, 나), 'sword_short')), '해제');
      const 칸 = await verify('해제 응답에 inventory · stats 가 온다', 칸들(응답), 목록글('inventory', 'stats'));
      const 빈칸 = await verify('짧은 검의 장착 칸이 비어 있다', 찾기(응답.inventory, 'sword_short')?.equippedSlot, null);
      await verify('장비를 해제하면 inventory · stats 가 오고 짧은 검의 장착 칸이 빈다', 칸 && 빈칸, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
