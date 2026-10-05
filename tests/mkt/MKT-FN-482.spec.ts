import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-482',
  name: '주소 검색어가 1자면 400 으로 응답한다',
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  await test.step('주소 검색을 q 1자 「테」로 부른다', async () => {
    const res = await request.get('/api/address', { params: { q: '테' } });
    await verify('주소 검색어가 1자면 400 으로 응답한다', res.status(), 400);
  });

  await test.step('주소 검색을 q 2자 「테헤」로 부른다', async () => {
    const res = await request.get('/api/address', { params: { q: '테헤' } });
    await verify('주소 검색어가 2자면 200 으로 응답한다', res.status(), 200);
  });
});
