import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원만들기 } from './helpers/account.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-355',
  name: '아이디와 이메일이 맞으면 비밀번호 찾기 API 가 일치한다고 응답한다',
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

  await test.step('일회용 회원 아이디와 이메일로 POST /api/auth/find-password 를 부른다', async () => {
    const 응답 = await request.post('/api/auth/find-password', { data: { loginId: 회원.loginId, email: 회원.email } });
    await verify('아이디와 이메일이 맞으면 비밀번호 찾기 API 가 일치한다고 응답한다', 응답.ok(), true);
  });

  await test.step('일회용 회원 아이디와 다른 이메일로 POST /api/auth/find-password 를 부른다', async () => {
    const 응답 = await request.post('/api/auth/find-password', { data: { loginId: 회원.loginId, email: `other.${회원.email}` } });
    await verify('아이디와 이메일이 다르면 비밀번호 찾기 API 가 일치하지 않는다고 응답한다', 응답.ok(), false);
  });
});
