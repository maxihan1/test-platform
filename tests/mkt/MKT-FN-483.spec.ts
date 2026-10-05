import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-483',
  name: '검색어 없이 부른 주소 검색은 400 으로 응답한다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  await test.step('주소 검색을 q 없이 부른다', async () => {
    const res = await request.get('/api/address');
    await verify('검색어 없이 부른 주소 검색은 400 으로 응답한다', res.status(), 400);
  });
});
