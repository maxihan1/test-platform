import { defineCase, test, verify } from '@platform/kit';

import { 가입, 본문, 새비밀번호, 새아이디 } from './helpers/api.helper.js';
import { 계정지우기 } from './helpers/game-state.helper.js';
import { 어드민키상태 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-364',
  name: '새 아이디로 가입하면 201 과 accountId 가 온다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  const 아이디 = 새아이디('qafn364');
  try {
    await test.step('어드민 키로 서버 설정을 읽을 수 있는지 확인한다', async () => {
      await verify('어드민 키로 서버 설정을 읽는다', await 어드민키상태(admin), 200, { blocker: true });
    });
    await test.step('새 아이디로 가입한다', async () => {
      const 응답 = await 가입(request, 아이디, 새비밀번호());
      const 몸 = await 본문<{ accountId: number }>(응답, '가입');
      const 코드인가 = await verify('응답 코드가 201 이다', 응답.status(), 201);
      const 번호인가 = await verify('accountId 가 온다', typeof 몸.accountId, 'number');
      await verify('새 아이디로 가입하면 201 과 accountId 가 온다', 코드인가 && 번호인가, true);
    });
  } finally {
    await 계정지우기(admin, 아이디);
  }
});
