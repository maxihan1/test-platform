import { defineCase, test, verify } from '@platform/kit';

import { 새캐릭터자리 } from './helpers/admin.helper.js';
import { 머리, type 캐릭터 } from './helpers/api.helper.js';
import { 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-471',
  name: '골드 500 인 캐릭터에 GM 골드 −600 을 지급하면 거부되고 골드가 500 그대로다',
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
      누구 = await 새캐릭터자리(admin, 'qafn471');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('GM 으로 골드 −600 을 지급한다', async () => {
      const 나 = 누구!;
      const 응답 = await request.post('/gm/gold', { headers: 머리(나), data: { amount: -600 } });
      const 거부 = await verify('골드 −600 지급 요청이 거부된다', 응답.ok(), false);
      const 그대로 = await verify('골드가 500 이다', (await 캐릭터읽기(admin, 나)).gold, 500);
      await verify('골드 500 인 캐릭터에 GM 골드 −600 을 지급하면 거부되고 골드가 500 그대로다', 거부 && 그대로, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
