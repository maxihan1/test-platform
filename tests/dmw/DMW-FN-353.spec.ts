import { defineCase, test, verify } from '@platform/kit';

import { API로그인, 일회용회원만들기 } from './helpers/account.helper.js';
import { 몸읽기 } from './helpers/my-admin-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-353',
  name: '로그인 상태에서 GET /api/auth/me 는 내 아이디를 돌려준다',
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

  await test.step('GET /api/auth/me 를 부른다', async () => {
    const 응답 = await request.get('/api/auth/me');
    await verify('로그인 상태에서 GET /api/auth/me 는 내 아이디를 돌려준다', (await 몸읽기<{ loginId?: string }>(응답)).loginId, 회원.loginId);
  });
});
