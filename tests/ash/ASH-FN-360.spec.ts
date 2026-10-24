import { defineCase, test, verify } from '@platform/kit';

import { 가입, 새비밀번호, 오류 } from './helpers/api.helper.js';
import { 계정지우기 } from './helpers/game-state.helper.js';
import { 무작위글, 어드민키상태 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-360',
  name: '대문자나 「-」가 든 아이디로 가입하면 400 「VALIDATION_FAILED」다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  const 아이디 = 'Qa-' + 무작위글(8);
  try {
    await test.step('어드민 키로 서버 설정을 읽을 수 있는지 확인한다', async () => {
      await verify('어드민 키로 서버 설정을 읽는다', await 어드민키상태(admin), 200, { blocker: true });
    });
    await test.step('대문자와 「-」가 든 아이디로 가입한다', async () => {
      const 응답 = await 가입(request, 아이디, 새비밀번호());
      const 코드인가 = await verify('응답 코드가 400 이다', 응답.status(), 400);
      const 이름인가 = await verify('오류 코드가 「VALIDATION_FAILED」다', (await 오류(응답)).code, 'VALIDATION_FAILED');
      await verify('대문자나 「-」가 든 아이디로 가입하면 400 「VALIDATION_FAILED」다', 코드인가 && 이름인가, true);
    });
  } finally {
    await 계정지우기(admin, 아이디);
  }
});
