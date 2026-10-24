import { defineCase, test, verify } from '@platform/kit';

import { 가입만, 계정지우기, 응답몸, 임의글자, 임의아이디 } from './helpers/game-state.helper.js';
import { 가입된수 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-364',
  name: '가입하면 201 이고 본문에 accountId 가 있다',
  platforms: ['android'],
  precondition: ['가입하지 않은 아이디가 있다'],
  smoke: true,
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 아이디 = '';
  let 만든계정: string | undefined;
  try {
    await test.step('가입하지 않은 아이디를 짓는다', async () => {
      아이디 = 임의아이디('zqa364');
    });

    await test.step('가입하지 않은 아이디인지 확인한다', async () => {
      await verify('가입하지 않은 아이디가 있다', await 가입된수(admin, 아이디), 0, { blocker: true });
    });

    await test.step('아이디와 비밀번호로 가입한다', async () => {
      const 응답 = await 가입만(request, 아이디, 임의글자(12));
      if (응답.status() === 201) 만든계정 = 아이디;
      const 코드 = await verify('응답 코드가 201 이다', 응답.status(), 201);
      const 몸 = await 응답몸<{ accountId?: unknown }>(응답);
      const 번호 = await verify('본문에 accountId 가 있다', 몸.accountId !== undefined && 몸.accountId !== null, true);
      await verify('가입하면 201 이고 본문에 accountId 가 있다', 코드 && 번호, true);
    });
  } finally {
    if (만든계정 !== undefined) await 계정지우기(admin, 만든계정);
  }
});
