import { defineCase, test, verify } from '@platform/kit';

import { 새캐릭터자리, GM설정읽기 } from './helpers/admin.helper.js';
import { 머리, type 캐릭터 } from './helpers/api.helper.js';
import { 드랍확률되돌리기, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-487',
  name: 'GM 으로 드랍 확률을 바꾸면 설정의 botLootChance 가 바뀐다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Town', 'drop:bot_loot'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn487');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('GM 으로 봇 전리품 확률을 바꾸고 설정을 받는다', async () => {
      const 나 = 누구!;
      await request.post('/gm/drop-rate', { headers: 머리(나), data: { botLootChance: 0.25 } });
      const 설정 = await GM설정읽기(request, 나);
      await verify('GM 으로 드랍 확률을 바꾸면 설정의 botLootChance 가 바뀐다', 설정.drop.botLootChance, 0.25);
    });
  } finally {
    await 드랍확률되돌리기(admin);
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
