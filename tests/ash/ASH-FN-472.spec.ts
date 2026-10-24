import { defineCase, test, verify } from '@platform/kit';

import { 새캐릭터자리 } from './helpers/admin.helper.js';
import { type 가방, 머리, 본문, 찾기, type 캐릭터 } from './helpers/api.helper.js';
import { 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-472',
  name: 'GM 아이템을 지급하면 가방에 롱 소드가 들어온다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Town', 'item:sword_long'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn472');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('GM 으로 롱 소드 1개를 지급한다', async () => {
      const 나 = 누구!;
      const 가방값 = await 본문<가방>(await request.post('/gm/item', { headers: 머리(나), data: { templateId: 'sword_long', quantity: 1, enhanceLevel: 0 } }), 'GM 아이템');
      await verify('GM 아이템을 지급하면 가방에 롱 소드가 들어온다', 찾기(가방값, 'sword_long') !== undefined, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
