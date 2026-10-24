import { defineCase, test, verify } from '@platform/kit';

import { type 계정, 새계정 } from './helpers/api.helper.js';
import { 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 무작위글, 이름으로캐릭터만들기 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-400',
  name: '캐릭터를 만들면 201 과 CharacterDto 칸이 온다',
  platforms: ['android'],
  precondition: ['새 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 계정: 계정 | undefined;
  try {
    await test.step('새 계정을 만든다', async () => {
      계정 = await 새계정(request, 'qafn400');
    });
    await test.step('새 계정이 있는지 확인한다', async () => {
      await verify('새 계정의 액세스 토큰을 받았다', typeof 계정?.토큰, 'string', { blocker: true });
    });
    await test.step('전사 캐릭터를 만든다', async () => {
      const 응답 = await 이름으로캐릭터만들기(request, 계정!, 무작위글(10));
      const 몸 = (await 응답.json()) as Record<string, unknown>;
      const 코드인가 = await verify('응답 코드가 201 이다', 응답.status(), 201);
      const 칸인가 = await verify('응답에 CharacterDto 칸이 온다', Object.keys(몸).sort(), ['alignment', 'classType', 'exp', 'expToNext', 'gender', 'gold', 'id', 'level', 'name', 'pkDeaths', 'pkKills', 'position', 'stats', 'zone']);
      await verify('캐릭터를 만들면 201 과 CharacterDto 칸이 온다', 코드인가 && 칸인가, true);
    });
  } finally {
    if (계정 !== undefined) await 캐릭터지우기(admin, 계정);
  }
});
