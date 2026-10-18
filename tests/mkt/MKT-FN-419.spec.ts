import { defineCase, test, verify } from '@platform/kit';
import { 세션회원있는가 } from './helpers/account.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-419',
  name: '주소 검색어가 비면 400 으로 응답한다',
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

  await test.step('검색어 없이 주소 검색을 부른다', async () => {
    const 응답 = await request.get('/api/address');
    await verify('주소 검색어가 비면 400 으로 응답한다', 응답.status(), 400);
  });
});
