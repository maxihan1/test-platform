import { defineCase, test, verify } from '@platform/kit';

import { 가입, 로그인, 새비밀번호, 새아이디 } from './helpers/api.helper.js';
import { 계정지우기 } from './helpers/game-state.helper.js';
import { 계정수 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-385',
  name: '로그인하면 액세스 토큰 expiresInSeconds 가 30분인 1800 이다',
  platforms: ['android'],
  precondition: ['가입한 새 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  const 아이디 = 새아이디('qafn385');
  const 비밀번호 = 새비밀번호();
  try {
    await test.step('가입한 새 계정을 만든다', async () => {
      await 가입(request, 아이디, 비밀번호);
    });
    await test.step('새 계정이 가입돼 있는지 확인한다', async () => {
      await verify('새 아이디의 계정이 하나 있다', await 계정수(admin, 아이디), 1, { blocker: true });
    });
    await test.step('로그인해 expiresInSeconds 를 읽는다', async () => {
      const 받은 = await 로그인(request, 아이디, 비밀번호);
      await verify('로그인하면 액세스 토큰 expiresInSeconds 가 30분인 1800 이다', 받은.expiresInSeconds, 1800);
    });
  } finally {
    await 계정지우기(admin, 아이디);
  }
});
