import { defineCase, test, verify } from '@platform/kit';

import { 가입만, 계정지우기, 새계정, 오류코드, 임의글자, type 계정 } from './helpers/game-state.helper.js';
import { 가입된수 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-369',
  name: '이미 있는 아이디로 가입하면 409 「USERNAME_TAKEN」이다',
  platforms: ['android'],
  precondition: ['가입한 아이디가 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 나: 계정 | undefined;
  try {
    await test.step('가입한 아이디를 만든다', async () => {
      나 = await 새계정(admin, 'zqa369');
    });

    await test.step('가입한 아이디가 있는지 확인한다', async () => {
      await verify('가입한 아이디가 있다', await 가입된수(admin, 나!.아이디), 1, { blocker: true });
    });

    await test.step('같은 아이디로 다시 가입한다', async () => {
      const 응답 = await 가입만(request, 나!.아이디, 임의글자(12));
      const 코드 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름 = await verify('오류 코드가 「USERNAME_TAKEN」이다', await 오류코드(응답), 'USERNAME_TAKEN');
      await verify('이미 있는 아이디로 가입하면 409 「USERNAME_TAKEN」이다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
