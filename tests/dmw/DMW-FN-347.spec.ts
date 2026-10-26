import { defineCase, test, verify } from '@platform/kit';

import { 새비밀번호, 새아이디 } from './helpers/account.helper.js';
import { 가입하기 } from './helpers/my-admin-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-347',
  name: '같은 아이디로 다시 가입하면 409 로 응답한다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  const 아이디 = 새아이디();
  const 비밀번호 = 새비밀번호();

  await test.step('비회원임을 확인한다', async () => {
    await verify('비회원이다', await 로그인한아이디(request), null, { blocker: true });
  });

  await test.step('새 아이디로 가입해 둔다', async () => {
    const 응답 = await 가입하기(request, { loginId: 아이디, password: 비밀번호, email: `${아이디}@example.com` });
    await verify('처음 가입은 201 로 응답한다', 응답.status(), 201, { blocker: true });
  });

  await test.step('같은 아이디로 POST /api/auth/signup 을 한 번 더 부른다', async () => {
    const 응답 = await 가입하기(request, { loginId: 아이디, password: 비밀번호, email: `${아이디}@example.com` });
    await verify('같은 아이디로 다시 가입하면 409 로 응답한다', 응답.status(), 409);
  });
});
