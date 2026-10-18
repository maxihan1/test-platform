import { defineCase, test, verify } from '@platform/kit';
import { 세션회원있는가 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-425',
  name: '비로그인 회원정보 수정 요청은 401 로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ request }) => {
  await test.step('비회원 상태를 확인한다', async () => {
    await verify('세션에 회원이 없다', await 세션회원있는가(request), false, { blocker: true });
  });

  await test.step('로그인 없이 회원정보 수정 요청을 보낸다', async () => {
    const 응답 = await request.put('/api/me', { data: { name: '비회원', email: 'nobody@example.com', phone: '', interests: [], avatar: null } });
    await verify('비로그인 회원정보 수정 요청은 401 로 응답한다', 응답.status(), 401);
  });
});
