import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새계정, 오류코드, 임의글자, 임의아이디, type 계정 } from './helpers/game-state.helper.js';
import { 가입된수 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-375',
  name: '틀린 비밀번호로 로그인하면 401 「INVALID_CREDENTIALS」다',
  platforms: ['android'],
  precondition: ['가입한 계정이 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 나: 계정 | undefined;
  let 없는아이디 = '';
  try {
    await test.step('가입한 계정과 가입하지 않은 아이디를 만든다', async () => {
      나 = await 새계정(admin, 'zqa375');
      없는아이디 = 임의아이디('zqa375');
    });

    await test.step('가입한 계정이 있고 가입하지 않은 아이디가 따로 있는지 확인한다', async () => {
      await verify('가입한 계정이 있다', await 가입된수(admin, 나!.아이디), 1, { blocker: true });
      await verify('로그인에 쓸 아이디가 가입돼 있지 않다', await 가입된수(admin, 없는아이디), 0, { blocker: true });
    });

    await test.step('틀린 비밀번호로 로그인한다', async () => {
      const 응답 = await request.post('/auth/login', { data: { username: 나!.아이디, password: 임의글자(12) } });
      const 코드 = await verify('틀린 비밀번호의 응답 코드가 401 이다', 응답.status(), 401);
      const 이름 = await verify('틀린 비밀번호의 오류 코드가 「INVALID_CREDENTIALS」다', await 오류코드(응답), 'INVALID_CREDENTIALS');
      await verify('틀린 비밀번호로 로그인하면 401 「INVALID_CREDENTIALS」다', 코드 && 이름, true);
    });

    await test.step('없는 아이디로 로그인한다', async () => {
      const 응답 = await request.post('/auth/login', { data: { username: 없는아이디, password: 임의글자(12) } });
      const 코드 = await verify('없는 아이디의 응답 코드가 401 이다', 응답.status(), 401);
      const 이름 = await verify('없는 아이디의 오류 코드가 「INVALID_CREDENTIALS」다', await 오류코드(응답), 'INVALID_CREDENTIALS');
      await verify('없는 아이디로 로그인하면 401 「INVALID_CREDENTIALS」다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
