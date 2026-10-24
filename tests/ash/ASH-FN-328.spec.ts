import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-328',
  name: '캐릭터 정보의 classType 이 문자열 「Warrior」로 온다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 하늘빛 마을에 있다'],
  elements: ['class:Warrior'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn328');
    });
    await test.step('새 캐릭터가 하늘빛 마을에 있는지 확인한다', async () => {
      await verify('새 캐릭터가 하늘빛 마을에 있다', (await 캐릭터정보받기(request, 누구!)).zone, 'Town', { blocker: true });
    });
    await test.step('캐릭터 정보를 받아 classType 을 읽는다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      const 문자열 = await verify('classType 이 문자열이다', typeof 정보.classType, 'string');
      const 전사 = await verify('classType 이 「Warrior」다', 정보.classType, 'Warrior');
      await verify('캐릭터 정보의 classType 이 문자열 「Warrior」로 온다', 문자열 && 전사, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
