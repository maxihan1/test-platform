import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'MKT-FN-326',
  name: '로그인 없이 GET /api/notifications 를 부르면 401 로 응답한다',
  precondition: ['로그인하지 않은 요청이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('GET /api/notifications 를 부른다', async () => {
    const res = await request.get('/api/notifications');
    await verify('로그인 없이 GET /api/notifications 를 부르면 401 로 응답한다', res.status(), 401);
  });
});
