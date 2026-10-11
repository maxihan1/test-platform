import { defineCase, test, verify } from '@platform/kit';

import { 새회원으로로그인, 탈퇴, 내정보 } from './helpers/account.helper.js';
import type { 회원정보 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-327',
  name: '맞는 비밀번호로 비밀번호 재확인을 부르면 200 으로 응답한다',
  precondition: ['새로 가입한 회원으로 로그인한 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 정보!: 회원정보;

  try {
    await test.step('임시 회원으로 가입해 로그인한다', async () => {
      정보 = await 새회원으로로그인(request);
    });

    await test.step('임시 회원으로 로그인했는지 확인한다', async () => {
      await verify('임시 회원으로 로그인해 있다', (await 내정보(request)).loginId === 정보.loginId, true, { blocker: true });
    });

    await test.step('맞는 비밀번호로 POST /api/me/verify-password 를 부른다', async () => {
      const 응답 = await request.post('/api/me/verify-password', { data: { password: 정보.password } });
      await verify('맞는 비밀번호로 비밀번호 재확인을 부르면 200 으로 응답한다', 응답.status(), 200);
    });

    await test.step('PUT /api/me 로 이름을 바꾸고 GET /api/auth/me 를 부른다', async () => {
      await request.put('/api/me', { data: { name: '바뀐이름', email: 정보.email, phone: '', interests: [], avatar: null } });
      const 본문 = (await (await request.get('/api/auth/me')).json()) as { name?: string };
      await verify('PUT /api/me 로 이름을 바꾸면 GET /api/auth/me 에 바뀐 이름이 돌아온다', 본문.name === '바뀐이름', true);
    });

    await test.step('DELETE /api/me 를 부른다', async () => {
      const 응답 = await request.delete('/api/me');
      await verify('DELETE /api/me 를 부르면 204 로 응답한다', 응답.status(), 204);
    });
  } finally {
    await 탈퇴(request);
  }
});
