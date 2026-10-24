import { defineCase, test, verify } from '@platform/kit';

import { 가방받기, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 아이템주기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-127',
  name: '파란 물약 5개를 받으면 가방 사용 칸이 1 만 는다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['item:potion_mp_s', 'zone:Town'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn127');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터의 구역이 「Town」이다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('파란 물약 5개를 받고 가방을 받는다', async () => {
      const 전 = await 가방받기(request, 누구!);
      await 아이템주기(admin, 누구!, 'potion_mp_s', { 수량: 5 });
      const 후 = await 가방받기(request, 누구!);
      await verify('파란 물약 5개를 받으면 가방 사용 칸이 1 만 는다', 후.used - 전.used, 1);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
