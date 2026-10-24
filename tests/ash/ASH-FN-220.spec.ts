import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 성향주기, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-220',
  name: '성향치가 −1 이면 상태가 「Chaotic」이다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['zone:Town', 'state:성향=악명'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn220');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('새 캐릭터가 하늘빛 마을에 있다', 정보.zone, 'Town', { blocker: true });
    });
    await test.step('성향치를 −1 로 바꾸고 캐릭터 정보를 받는다', async () => {
      await 성향주기(admin, 누구!, -1);
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('성향치가 −1 이면 상태가 「Chaotic」이다', 정보.alignment.state, 'Chaotic');
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
