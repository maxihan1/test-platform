import { defineCase, test, verify } from '@platform/kit';

import { 가입, 새비밀번호, 새아이디, 오류 } from './helpers/api.helper.js';
import { 계정지우기 } from './helpers/game-state.helper.js';
import { 계정수, 로그인응답 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-375',
  name: '틀린 비밀번호로 로그인하면 401 「INVALID_CREDENTIALS」다',
  platforms: ['android'],
  precondition: ['가입한 새 계정이 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  const 아이디 = 새아이디('qafn375');
  const 비밀번호 = 새비밀번호();
  try {
    await test.step('가입한 새 계정을 만든다', async () => {
      await 가입(request, 아이디, 비밀번호);
    });
    await test.step('새 계정이 가입돼 있는지 확인한다', async () => {
      await verify('새 아이디의 계정이 하나 있다', await 계정수(admin, 아이디), 1, { blocker: true });
    });
    await test.step('틀린 비밀번호로 로그인한다', async () => {
      const 응답 = await 로그인응답(request, 아이디, 비밀번호 + 'x');
      const 코드인가 = await verify('응답 코드가 401 이다', 응답.status(), 401);
      const 이름인가 = await verify('오류 코드가 「INVALID_CREDENTIALS」다', (await 오류(응답)).code, 'INVALID_CREDENTIALS');
      await verify('틀린 비밀번호로 로그인하면 401 「INVALID_CREDENTIALS」다', 코드인가 && 이름인가, true);
    });
  } finally {
    await 계정지우기(admin, 아이디);
  }
});
