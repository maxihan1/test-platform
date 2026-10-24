import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새계정, type 계정 } from './helpers/game-state.helper.js';
import { 가입된수 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-373',
  name: '맞는 아이디와 비밀번호로 로그인하면 200 이다',
  platforms: ['android'],
  precondition: ['가입한 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 나: 계정 | undefined;
  try {
    await test.step('가입한 계정을 만든다', async () => {
      나 = await 새계정(admin, 'zqa373');
    });

    await test.step('가입한 계정이 있는지 확인한다', async () => {
      await verify('가입한 계정이 있다', await 가입된수(admin, 나!.아이디), 1, { blocker: true });
    });

    await test.step('맞는 아이디와 비밀번호로 로그인한다', async () => {
      const 응답 = await request.post('/auth/login', { data: { username: 나!.아이디, password: 나!.비밀번호 } });
      await verify('맞는 아이디와 비밀번호로 로그인하면 200 이다', 응답.status(), 200);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
