import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새계정, 응답몸, type 계정 } from './helpers/game-state.helper.js';
import { 가입된수 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-370',
  name: '로그인하면 200 이고 accessToken · refreshToken · expiresInSeconds 가 온다',
  platforms: ['android'],
  precondition: ['가입한 계정이 있다'],
  smoke: true,
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 나: 계정 | undefined;
  try {
    await test.step('가입한 계정을 만든다', async () => {
      나 = await 새계정(admin, 'zqa370');
    });

    await test.step('가입한 계정이 있는지 확인한다', async () => {
      await verify('가입한 계정이 있다', await 가입된수(admin, 나!.아이디), 1, { blocker: true });
    });

    await test.step('아이디와 비밀번호로 로그인한다', async () => {
      const 응답 = await request.post('/auth/login', { data: { username: 나!.아이디, password: 나!.비밀번호 } });
      const 코드 = await verify('응답 코드가 200 이다', 응답.status(), 200);
      const 몸 = await 응답몸<{ accessToken?: unknown; refreshToken?: unknown; expiresInSeconds?: unknown }>(응답);
      const 접근 = await verify('본문에 accessToken 이 있다', typeof 몸.accessToken === 'string' && 몸.accessToken !== '', true);
      const 갱신 = await verify('본문에 refreshToken 이 있다', typeof 몸.refreshToken === 'string' && 몸.refreshToken !== '', true);
      const 만료 = await verify('본문에 expiresInSeconds 가 있다', typeof 몸.expiresInSeconds === 'number', true);
      await verify('로그인하면 200 이고 accessToken · refreshToken · expiresInSeconds 가 온다', 코드 && 접근 && 갱신 && 만료, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
