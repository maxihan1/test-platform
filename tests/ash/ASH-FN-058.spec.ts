import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 레벨주기, 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-058',
  name: '레벨 3 캐릭터 정보를 받으면 다음 레벨까지 필요 경험치가 600 이다',
  platforms: ['android'],
  precondition: ['레벨 3 새 전사 캐릭터가 있다'],
  elements: ['class:Warrior'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('레벨 3 새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn058');
      await 레벨주기(admin, 누구, 3);
    });
    await test.step('새 전사 캐릭터가 레벨 3 인지 확인한다', async () => {
      await verify('새 전사 캐릭터가 레벨 3 이다', (await 캐릭터정보받기(request, 누구!)).level, 3, { blocker: true });
    });
    await test.step('캐릭터 정보를 받는다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('레벨 3 캐릭터 정보를 받으면 다음 레벨까지 필요 경험치가 600 이다', 정보.expToNext, 600);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
  }
});
