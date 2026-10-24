import { defineCase, test, verify } from '@platform/kit';

import { 새캐릭터자리 } from './helpers/admin.helper.js';
import { type 캐릭터 } from './helpers/api.helper.js';
import { 골드주기, 원장읽기, 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-586',
  name: '어드민으로 골드를 바꾸면 원장에 차액 300 이 「ADMIN_ADJUST」로 남는다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Town', 'flow:골드-어드민'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn586');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('어드민으로 골드를 500 에서 800 으로 바꾸고 원장을 받는다', async () => {
      const 나 = 누구!;
      await 골드주기(admin, 나, 800);
      const 맨앞 = (await 원장읽기(admin, 나))[0];
      const 차액 = await verify('원장 맨 앞 줄의 delta 가 300 이다', 맨앞?.delta, 300);
      const 사유 = await verify('원장 맨 앞 줄의 사유가 「ADMIN_ADJUST」다', 맨앞?.reason, 'ADMIN_ADJUST');
      await verify('어드민으로 골드를 바꾸면 원장에 차액 300 이 「ADMIN_ADJUST」로 남는다', 차액 && 사유, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
