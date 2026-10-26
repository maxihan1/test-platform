import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원만들기 } from './helpers/account.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 로그인하기 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-349',
  name: '맞는 아이디와 비밀번호로 부르면 로그인 API 가 200 으로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 회원 = { id: 0, loginId: '', password: '', name: '', email: '' };

  await test.step('비회원임을 확인한다', async () => {
    await verify('비회원이다', await 로그인한아이디(request), null, { blocker: true });
  });

  await test.step('일회용 회원을 만든다', async () => {
    회원 = await 일회용회원만들기(request);
  });

  await test.step('일회용 회원으로 POST /api/auth/login 을 부른다', async () => {
    const 응답 = await 로그인하기(request, 회원.loginId, 회원.password);
    await verify('맞는 아이디와 비밀번호로 부르면 로그인 API 가 200 으로 응답한다', 응답.status(), 200);
  });
});
