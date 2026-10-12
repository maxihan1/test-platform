import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-258',
  name: '주소 검색어 1자로 부르면 400 으로 응답한다',
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('GET /api/address?q= 에 1자 검색어를 넣어 부른다', async () => {
    const res = await request.get('/api/address', { params: { q: '가' } });
    await verify('주소 검색어 1자로 부르면 400 으로 응답한다', res.status(), 400);
  });

  await test.step('GET /api/address?q= 에 2자 검색어를 넣어 부른다', async () => {
    const res = await request.get('/api/address', { params: { q: '강남' } });
    await verify('주소 검색어 2자로 부르면 200 으로 응답한다', res.status(), 200);
  });
});
