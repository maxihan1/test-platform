import { defineCase, test, verify } from '@platform/kit';

import { API로그인, 일회용회원만들기 } from './helpers/account.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-351',
  name: '로그인 상태에서 로그아웃 API 를 부르면 204 로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 회원 = { id: 0, loginId: '', password: '', name: '', email: '' };

  await test.step('일회용 회원으로 로그인한다', async () => {
    회원 = await 일회용회원만들기(request);
    await API로그인(request, 회원.loginId, 회원.password);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(request), 회원.loginId, { blocker: true });
  });

  await test.step('POST /api/auth/logout 을 부른다', async () => {
    const 응답 = await request.post('/api/auth/logout');
    await verify('로그인 상태에서 로그아웃 API 를 부르면 204 로 응답한다', 응답.status(), 204);
  });
});
