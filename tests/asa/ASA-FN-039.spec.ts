import { defineCase, test, verify } from '@platform/kit';

import { 로그인, 새비밀번호, 새아이디, 칸이름들 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-039',
  name: '로그인이 막히면 오류 응답의 칸이 「code」 · 「message」 둘이다',
  apiDoc: 2,
  techniques: ['동등 분할'],
  precondition: ['가입하지 않은 아이디다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('가입하지 않은 아이디로 로그인해 오류 응답을 읽는다', async () => {
    const 응답 = await 로그인(request, 새아이디(), 새비밀번호());
    await verify('로그인이 막히면 오류 응답의 칸이 「code」 · 「message」 둘이다', await 칸이름들(응답), 'code, message');
  });
});
