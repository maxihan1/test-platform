import { defineCase, test, verify } from '@platform/kit';

import { 물약사고팔기, 새캐릭터자리 } from './helpers/admin.helper.js';
import { 머리, 본문, type 캐릭터, type 캐릭터정보 } from './helpers/api.helper.js';
import { 골드주기, 원장읽기, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-592',
  name: '골드를 여러 번 바꿔도 원장 delta 합계가 현재 골드와 같다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Town', 'flow:골드-어드민', 'flow:골드-GM', 'flow:골드-상점구매', 'flow:골드-상점판매'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn592');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('골드를 여러 번 바꾼 뒤 원장 합계와 골드를 견준다', async () => {
      const 나 = 누구!;
      await 골드주기(admin, 나, 800);
      await 본문<캐릭터정보>(await request.post('/gm/gold', { headers: 머리(나), data: { amount: 1000 } }), 'GM 골드');
      await 물약사고팔기(request, 나);
      await 골드주기(admin, 나, 300);
      await 본문<캐릭터정보>(await request.post('/gm/gold', { headers: 머리(나), data: { amount: -200 } }), 'GM 골드');
      const 합계 = (await 원장읽기(admin, 나, 100)).reduce((합, 줄) => 합 + 줄.delta, 0);
      await verify('골드를 여러 번 바꿔도 원장 delta 합계가 현재 골드와 같다', 합계, (await 캐릭터읽기(admin, 나)).gold);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
