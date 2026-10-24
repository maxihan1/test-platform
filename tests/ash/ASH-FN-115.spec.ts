import { defineCase, test, verify } from '@platform/kit';

import { type 계정, 새계정, 캐릭터만들기, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 캐릭터지우기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-115',
  name: '새 캐릭터를 만들면 골드가 500 이다',
  platforms: ['android'],
  precondition: ['새 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 내계정: 계정 | undefined;
  try {
    await test.step('새 계정을 만든다', async () => {
      내계정 = await 새계정(request, 'qafn115');
    });
    await test.step('새 계정으로 로그인했는지 확인한다', async () => {
      await verify('새 계정의 토큰을 받았다', typeof 내계정?.토큰, 'string', { blocker: true });
    });
    await test.step('전사 캐릭터를 만들고 캐릭터 정보를 받는다', async () => {
      const 만든 = await 캐릭터만들기(request, 내계정!);
      const 정보 = await 캐릭터정보받기(request, 만든);
      await verify('새 캐릭터를 만들면 골드가 500 이다', 정보.gold, 500);
    });
  } finally {
    if (내계정 !== undefined) await 캐릭터지우기(admin, 내계정);
  }
});
