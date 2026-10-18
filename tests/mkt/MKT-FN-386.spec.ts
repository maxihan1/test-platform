import { defineCase, test, verify } from '@platform/kit';
import { 로그아웃요청, 세션회원있는가 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-386',
  name: '비로그인 로그아웃 요청은 401 로 응답한다',
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

  await test.step('로그인 없이 로그아웃 요청을 보낸다', async () => {
    await verify('비로그인 로그아웃 요청은 401 로 응답한다', await 로그아웃요청(request), 401);
  });
});
