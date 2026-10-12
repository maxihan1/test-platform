import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-263',
  name: '비회원이 회원정보 수정을 부르면 401 로 응답한다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('비회원으로 PUT /api/me 를 부른다', async () => {
    const res = await request.put('/api/me', { data: { name: '바뀐이름', email: 'nobody@example.com', phone: '', interests: [], avatar: null } });
    await verify('비회원이 회원정보 수정을 부르면 401 로 응답한다', res.status(), 401);
  });

  await test.step('비회원으로 POST /api/me/verify-password 를 부른다', async () => {
    const res = await request.post('/api/me/verify-password', { data: { password: 'Tq12345!a' } });
    await verify('비회원이 비밀번호 재확인을 부르면 401 로 응답한다', res.status(), 401);
  });

  await test.step('비회원으로 DELETE /api/me 를 부른다', async () => {
    const res = await request.delete('/api/me');
    await verify('비회원이 탈퇴를 부르면 401 로 응답한다', res.status(), 401);
  });
});
