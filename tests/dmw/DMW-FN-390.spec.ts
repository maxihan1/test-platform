import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 일회용회원만들기 } from './helpers/account.helper.js';
import { 로그인하기, 몸읽기 } from './helpers/my-admin-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-390',
  name: '맞는 비밀번호로 재확인 API 를 부르면 200 으로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: z.object({
    새이름: z.string().min(1).max(10).describe('고칠 이름 — 1~10자').default('바뀐이름'),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  let 회원 = { id: 0, loginId: '', password: '', name: '', email: '' };

  await test.step('일회용 회원으로 로그인한다', async () => {
    회원 = await 일회용회원만들기(request);
    await API로그인(request, 회원.loginId, 회원.password);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(request), 회원.loginId, { blocker: true });
  });

  await test.step('맞는 비밀번호로 POST /api/me/verify-password 를 부른다', async () => {
    const 응답 = await request.post('/api/me/verify-password', { data: { password: 회원.password } });
    await verify('맞는 비밀번호로 재확인 API 를 부르면 200 으로 응답한다', 응답.status(), 200);
  });

  await test.step('PUT /api/me 로 이름을 고친다', async () => {
    await request.put('/api/me', { data: { name: params.새이름, email: 회원.email, phone: '', interests: [], avatar: null } });
    const 몸 = await 몸읽기<{ name?: string }>(await request.get('/api/auth/me'));
    await verify('회원정보 수정 API 로 이름을 고치면 GET /api/auth/me 의 이름이 바뀐다', 몸.name, params.새이름);
  });

  await test.step('DELETE /api/me 를 부른다', async () => {
    await request.delete('/api/me');
    const 응답 = await 로그인하기(request, 회원.loginId, 회원.password);
    await verify('탈퇴 API 를 부르면 그 아이디로 다시 로그인할 수 없다', 응답.ok(), false);
  });
});
