import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'DMW-FN-385',
  name: '주소 검색어 없이 부르면 400 과 code 「VALIDATION」으로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['동등 분할'],
});

test(spec, async ({ request }) => {
  await test.step('q 없이 GET /api/address 를 부른다', async () => {
    const 응답 = await request.get('/api/address');
    const 코드 = await verify('응답 코드가 400이다', 응답.status(), 400);
    const 이름 = await verify('응답의 code 가 「VALIDATION」이다', ((await 응답.json()) as { code?: string }).code, 'VALIDATION');
    await verify('주소 검색어 없이 부르면 400 과 code 「VALIDATION」으로 응답한다', 코드 && 이름, true);
  });
});
