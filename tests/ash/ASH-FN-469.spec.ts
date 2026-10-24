import { defineCase, test, verify } from '@platform/kit';

import { 새캐릭터자리 } from './helpers/admin.helper.js';
import { 머리, 본문, type 캐릭터, type 캐릭터정보 } from './helpers/api.helper.js';
import { 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-469',
  name: 'GM 골드를 −200 으로 지급하면 골드가 200 준다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Town', 'flow:골드-GM'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn469');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('GM 으로 골드 −200 을 지급한다', async () => {
      const 나 = 누구!;
      const 전 = await 캐릭터읽기(admin, 나);
      const 후 = await 본문<캐릭터정보>(await request.post('/gm/gold', { headers: 머리(나), data: { amount: -200 } }), 'GM 골드');
      await verify('GM 골드를 −200 으로 지급하면 골드가 200 준다', 전.gold - 후.gold, 200);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
