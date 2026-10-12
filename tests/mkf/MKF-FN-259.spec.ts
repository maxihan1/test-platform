import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-259',
  name: '주소 검색어 없이 부르면 400 VALIDATION 으로 응답한다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('GET /api/address 를 검색어 없이 부른다', async () => {
    const res = await request.get('/api/address');
    const 코드 = ((await res.json()) as { code?: string }).code;
    await verify('주소 검색어 없이 부르면 400 VALIDATION 으로 응답한다', `${String(res.status())} ${String(코드)}`, '400 VALIDATION');
  });
});
