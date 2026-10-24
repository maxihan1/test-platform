import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새계정, 플레이어머리, type 계정 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-331',
  name: '토큰을 붙여 내 캐릭터 목록을 부르면 200 이다',
  platforms: ['android'],
  precondition: ['로그인한 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 계정 | undefined;
  try {
    await test.step('로그인한 계정을 만든다', async () => {
      나 = await 새계정(admin, 'zqa331');
    });

    await test.step('로그인한 계정의 토큰이 있는지 확인한다', async () => {
      await verify('로그인한 계정이 있다', 나!.토큰 !== '', true, { blocker: true });
    });

    await test.step('토큰을 붙여 내 캐릭터 목록을 부른다', async () => {
      const 응답 = await admin.get('/characters', { headers: 플레이어머리(나!) });
      await verify('토큰을 붙여 내 캐릭터 목록을 부르면 200 이다', 응답.status(), 200);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
