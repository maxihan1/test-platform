import { defineCase, test, verify } from '@platform/kit';

import { 가입만, 계정지우기, 임의글자 } from './helpers/game-state.helper.js';
import { 가입된수 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-358',
  name: '소문자 · 숫자 · 밑줄로 된 아이디로 가입하면 201 이다',
  platforms: ['android'],
  precondition: ['가입하지 않은 아이디가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 아이디 = '';
  let 만든계정: string | undefined;
  try {
    await test.step('소문자 · 숫자 · 밑줄로 된 가입하지 않은 아이디를 짓는다', async () => {
      아이디 = `zqa358_${임의글자(6)}`;
    });

    await test.step('가입하지 않은 아이디인지 확인한다', async () => {
      await verify('가입하지 않은 아이디가 있다', await 가입된수(admin, 아이디), 0, { blocker: true });
    });

    await test.step('소문자 · 숫자 · 밑줄로 된 아이디로 가입한다', async () => {
      const 응답 = await 가입만(request, 아이디, 임의글자(12));
      if (응답.status() === 201) 만든계정 = 아이디;
      await verify('소문자 · 숫자 · 밑줄로 된 아이디로 가입하면 201 이다', 응답.status(), 201);
    });
  } finally {
    if (만든계정 !== undefined) await 계정지우기(admin, 만든계정);
  }
});
