import { defineCase, test, verify } from '@platform/kit';

import { 가입, 새비밀번호, 새아이디, type 토큰 } from './helpers/api.helper.js';
import { 계정지우기 } from './helpers/game-state.helper.js';
import { 계정수, 로그인응답 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-370',
  name: '맞는 아이디와 비밀번호로 로그인하면 200 과 accessToken · refreshToken · expiresInSeconds 가 온다',
  platforms: ['android'],
  precondition: ['가입한 새 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  const 아이디 = 새아이디('qafn370');
  const 비밀번호 = 새비밀번호();
  try {
    await test.step('가입한 새 계정을 만든다', async () => {
      await 가입(request, 아이디, 비밀번호);
    });
    await test.step('새 계정이 가입돼 있는지 확인한다', async () => {
      await verify('새 아이디의 계정이 하나 있다', await 계정수(admin, 아이디), 1, { blocker: true });
    });
    await test.step('아이디와 비밀번호로 로그인한다', async () => {
      const 응답 = await 로그인응답(request, 아이디, 비밀번호);
      const 몸 = (await 응답.json()) as 토큰;
      const 코드인가 = await verify('응답 코드가 200 이다', 응답.status(), 200);
      const 액세스인가 = await verify('accessToken 이 온다', typeof 몸.accessToken, 'string');
      const 리프레시인가 = await verify('refreshToken 이 온다', typeof 몸.refreshToken, 'string');
      const 시간인가 = await verify('expiresInSeconds 가 온다', typeof 몸.expiresInSeconds, 'number');
      await verify('맞는 아이디와 비밀번호로 로그인하면 200 과 accessToken · refreshToken · expiresInSeconds 가 온다', 코드인가 && 액세스인가 && 리프레시인가 && 시간인가, true);
    });
  } finally {
    await 계정지우기(admin, 아이디);
  }
});
