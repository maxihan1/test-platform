import { defineCase, test, verify } from '@platform/kit';
import { 세션회원있는가 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-391',
  name: '비로그인으로 session 을 부르면 401 이 아니라 200 과 user null 로 응답한다',
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

  await test.step('로그인 없이 session 을 부른다', async () => {
    const 응답 = await request.get('/api/session');
    const 본문 = (await 응답.json()) as { user: unknown };
    await verify('비로그인으로 session 을 부르면 401 이 아니라 200 과 user null 로 응답한다', { 상태: 응답.status(), user: 본문.user }, { 상태: 200, user: null });
  });
});
