import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'DMN-FN-121',
  name: '토큰 없이 서버 상태를 부르면 200 이다',
  apiDoc: 1,
  precondition: ['요청에 토큰이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('토큰 없이 서버 상태를 부른다', async () => {
    const res = await request.get('/v1/health');
    await verify('토큰 없이 서버 상태를 부르면 200 이다', res.status(), 200);
  });
});
