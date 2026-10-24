import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새계정, 플레이어머리, type 계정 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-382',
  name: '받은 리프레시 토큰 그대로 리프레시하면 200 이다',
  platforms: ['android'],
  precondition: ['로그인한 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 나: 계정 | undefined;
  try {
    await test.step('로그인한 계정을 만든다', async () => {
      나 = await 새계정(admin, 'zqa382');
    });

    await test.step('로그인한 계정의 토큰이 통하는지 확인한다', async () => {
      const 응답 = await admin.get('/characters', { headers: 플레이어머리(나!) });
      await verify('로그인한 계정이 있다', 응답.status(), 200, { blocker: true });
    });

    await test.step('받은 리프레시 토큰으로 리프레시한다', async () => {
      const 응답 = await request.post('/auth/refresh', { data: { refreshToken: 나!.리프레시 } });
      await verify('받은 리프레시 토큰 그대로 리프레시하면 200 이다', 응답.status(), 200);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
