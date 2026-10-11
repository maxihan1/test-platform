import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'MKT-FN-146',
  name: '주소 검색을 1자로 요청하면 400 으로 응답한다',
  platforms: ['desktop'],
  precondition: ['대상 서버 API 에 접근할 수 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('주소 검색 API 를 1자로 요청한다', async () => {
    const 응답 = await request.get('/api/address', { params: { q: '강' } });
    await verify('주소 검색을 1자로 요청하면 400 으로 응답한다', 응답.status(), 400);
  });

  await test.step('주소 검색 API 를 2자로 요청한다', async () => {
    const 응답 = await request.get('/api/address', { params: { q: '강남' } });
    await verify('주소 검색을 2자로 요청하면 200 으로 응답한다', 응답.status(), 200);
  });
});
