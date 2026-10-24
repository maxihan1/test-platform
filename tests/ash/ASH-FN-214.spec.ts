import { defineCase, test, verify } from '@platform/kit';

import { type 계정, 새계정, 캐릭터만들기, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-214',
  name: '새 캐릭터를 만들면 성향치가 0 이다',
  platforms: ['android'],
  precondition: ['새 계정이 있다'],
  elements: ['state:성향=선량'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 계정: 계정 | undefined;
  try {
    await test.step('새 계정을 만든다', async () => {
      계정 = await 새계정(request, 'qafn214');
    });
    await test.step('새 계정으로 로그인했는지 확인한다', async () => {
      await verify('새 계정의 액세스 토큰을 받았다', typeof 계정?.토큰, 'string', { blocker: true });
    });
    await test.step('전사 캐릭터를 만들고 캐릭터 정보를 받는다', async () => {
      const 나 = await 캐릭터만들기(request, 계정!, 'Warrior');
      const 정보 = await 캐릭터정보받기(request, 나);
      await verify('새 캐릭터를 만들면 성향치가 0 이다', 정보.alignment.value, 0);
    });
  } finally {
    if (계정 !== undefined) await 캐릭터지우기(admin, 계정);
  }
});
