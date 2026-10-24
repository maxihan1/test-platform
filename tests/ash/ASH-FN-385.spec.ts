import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새계정, 응답몸, type 계정 } from './helpers/game-state.helper.js';
import { 가입된수 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-385',
  name: '로그인하면 expiresInSeconds 가 30분인 1800 이다',
  platforms: ['android'],
  precondition: ['가입한 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 나: 계정 | undefined;
  try {
    await test.step('가입한 계정을 만든다', async () => {
      나 = await 새계정(admin, 'zqa385');
    });

    await test.step('가입한 계정이 있는지 확인한다', async () => {
      await verify('가입한 계정이 있다', await 가입된수(admin, 나!.아이디), 1, { blocker: true });
    });

    await test.step('로그인하고 expiresInSeconds 를 읽는다', async () => {
      const 응답 = await request.post('/auth/login', { data: { username: 나!.아이디, password: 나!.비밀번호 } });
      await verify('로그인 응답이 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<{ expiresInSeconds?: unknown }>(응답);
      await verify('로그인하면 expiresInSeconds 가 30분인 1800 이다', 몸.expiresInSeconds, 1800);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
