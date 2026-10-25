import { defineCase, test, verify } from '@platform/kit';

import { 비밀번호틀리기, 일회용회원만들기 } from './helpers/account.helper.js';
import { 로그인하기, 몸읽기 } from './helpers/my-admin-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-350',
  name: '비밀번호가 틀리면 로그인 API 가 401 로 응답한다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할', '상태 전이'],
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

  await test.step('일회용 회원 아이디와 틀린 비밀번호로 POST /api/auth/login 을 부른다', async () => {
    const 응답 = await 로그인하기(request, 회원.loginId, `${회원.password}x`);
    await verify('비밀번호가 틀리면 로그인 API 가 401 로 응답한다', 응답.status(), 401);
  });

  await test.step('일회용 회원으로 틀린 비밀번호를 5번 보낸 뒤 맞게 부른다', async () => {
    await 비밀번호틀리기(request, 회원.loginId, 5);
    const 응답 = await 로그인하기(request, 회원.loginId, 회원.password);
    const 상태 = await verify('상태 코드가 423 이다', 응답.status(), 423);
    const 코드 = await verify('code 가 「LOCKED」다', (await 몸읽기<{ code?: string }>(응답)).code, 'LOCKED');
    await verify('5번 틀려 잠기면 로그인 API 가 423 과 code 「LOCKED」로 응답한다', 상태 && 코드, true);
  });
});
