import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보 } from './helpers/account.helper.js';
import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-286',
  name: '없는 아이디로 GET /api/auth/check-id 를 부르면 { "available": true } 가 돌아온다',
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('로그인하지 않은 요청인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('아무도 쓰지 않는 아이디로 GET /api/auth/check-id 를 부른다', async () => {
    const 응답 = await request.get(`/api/auth/check-id?loginId=${새회원정보().loginId}`);
    await verify('없는 아이디로 GET /api/auth/check-id 를 부르면 { "available": true } 가 돌아온다', await 응답.json(), { available: true });
  });

  await test.step('「user2」로 GET /api/auth/check-id 를 부른다', async () => {
    const 응답 = await request.get('/api/auth/check-id?loginId=user2');
    const 본문 = (await 응답.json()) as { available?: boolean };
    await verify('있는 아이디로 GET /api/auth/check-id 를 부르면 available 이 false 다', 본문.available, false);
  });
});
