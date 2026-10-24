import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새계정, 응답몸, 플레이어머리, type 계정 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-376',
  name: '리프레시하면 200 이고 accessToken 과 앞과 다른 refreshToken 이 온다',
  platforms: ['android'],
  precondition: ['로그인한 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 나: 계정 | undefined;
  try {
    await test.step('로그인한 계정을 만든다', async () => {
      나 = await 새계정(admin, 'zqa376');
    });

    await test.step('로그인한 계정의 토큰이 통하는지 확인한다', async () => {
      const 응답 = await admin.get('/characters', { headers: 플레이어머리(나!) });
      await verify('로그인한 계정이 있다', 응답.status(), 200, { blocker: true });
    });

    await test.step('리프레시 토큰으로 리프레시한다', async () => {
      const 응답 = await request.post('/auth/refresh', { data: { refreshToken: 나!.리프레시 } });
      const 코드 = await verify('응답 코드가 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<{ accessToken?: unknown; refreshToken?: unknown }>(응답);
      const 접근 = await verify('accessToken 이 온다', typeof 몸.accessToken === 'string' && 몸.accessToken !== '', true);
      const 갱신 = await verify('refreshToken 이 앞과 다르다', typeof 몸.refreshToken === 'string' && 몸.refreshToken !== 나!.리프레시, true);
      await verify('리프레시하면 200 이고 accessToken 과 앞과 다른 refreshToken 이 온다', 코드 && 접근 && 갱신, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
