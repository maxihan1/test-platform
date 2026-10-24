import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새계정, 오류코드, type 계정 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-381',
  name: '이미 쓴 리프레시 토큰으로 다시 리프레시하면 401 「INVALID_REFRESH_TOKEN」이다',
  platforms: ['android'],
  precondition: ['한 번 리프레시한 계정이 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 나: 계정 | undefined;
  let 첫째코드 = 0;
  try {
    await test.step('계정을 만들고 한 번 리프레시한다', async () => {
      나 = await 새계정(admin, 'zqa381');
      첫째코드 = (await request.post('/auth/refresh', { data: { refreshToken: 나.리프레시 } })).status();
    });

    await test.step('한 번 리프레시한 계정이 있는지 확인한다', async () => {
      await verify('한 번 리프레시한 계정이 있다', 첫째코드, 200, { blocker: true });
    });

    await test.step('앞에 쓴 리프레시 토큰으로 다시 리프레시한다', async () => {
      const 응답 = await request.post('/auth/refresh', { data: { refreshToken: 나!.리프레시 } });
      const 코드 = await verify('응답 코드가 401 이다', 응답.status(), 401);
      const 이름 = await verify('오류 코드가 「INVALID_REFRESH_TOKEN」이다', await 오류코드(응답), 'INVALID_REFRESH_TOKEN');
      await verify('이미 쓴 리프레시 토큰으로 다시 리프레시하면 401 「INVALID_REFRESH_TOKEN」이다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
