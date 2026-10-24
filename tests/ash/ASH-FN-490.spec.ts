import { defineCase, test, verify } from '@platform/kit';

import { 목록글, 새캐릭터자리, 칸들, GM설정읽기 } from './helpers/admin.helper.js';
import { type 캐릭터 } from './helpers/api.helper.js';
import { 캐릭터읽기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-490',
  name: 'GM 설정을 받으면 enhance · drop 두 칸이 온다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Town'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 하늘빛 마을에 만든다', async () => {
      누구 = await 새캐릭터자리(admin, 'qafn490');
    });
    await test.step('새 전사 캐릭터의 자리를 확인한다', async () => {
      await verify('새 전사 캐릭터가 하늘빛 마을에 있다', (await 캐릭터읽기(admin, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('GM 설정을 받는다', async () => {
      const 설정 = await GM설정읽기(request, 누구!);
      await verify('GM 설정을 받으면 enhance · drop 두 칸이 온다', 칸들(설정), 목록글('enhance', 'drop'));
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
