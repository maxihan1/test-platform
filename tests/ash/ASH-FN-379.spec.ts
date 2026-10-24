import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새계정, 응답몸, type 계정 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-379',
  name: '새로 받은 리프레시 토큰으로 리프레시하면 200 이다',
  platforms: ['android'],
  precondition: ['한 번 리프레시한 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 나: 계정 | undefined;
  let 첫째코드 = 0;
  let 새리프레시 = '';
  try {
    await test.step('계정을 만들고 한 번 리프레시한다', async () => {
      나 = await 새계정(admin, 'zqa379');
      const 응답 = await request.post('/auth/refresh', { data: { refreshToken: 나.리프레시 } });
      첫째코드 = 응답.status();
      if (응답.ok()) 새리프레시 = String((await 응답몸<{ refreshToken?: unknown }>(응답)).refreshToken ?? '');
    });

    await test.step('한 번 리프레시한 계정이 있는지 확인한다', async () => {
      await verify('한 번 리프레시한 계정이 있다', 첫째코드, 200, { blocker: true });
    });

    await test.step('새로 받은 리프레시 토큰으로 다시 리프레시한다', async () => {
      const 응답 = await request.post('/auth/refresh', { data: { refreshToken: 새리프레시 } });
      await verify('새로 받은 리프레시 토큰으로 리프레시하면 200 이다', 응답.status(), 200);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
