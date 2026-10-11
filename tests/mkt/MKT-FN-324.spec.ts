import { defineCase, test, verify } from '@platform/kit';



export const spec = defineCase({
  tcId: 'MKT-FN-324',
  name: '로그인 없이 GET /api/inquiries 를 부르면 401 로 응답한다',
  techniques: ['동등 분할'],
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('로그인하지 않은 요청인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', ((await (await request.get('/api/session')).json()) as { user: unknown }).user, null, { blocker: true });
  });

  await test.step('GET /api/inquiries 를 부른다', async () => {
    const 응답 = await request.get('/api/inquiries');
    await verify('로그인 없이 GET /api/inquiries 를 부르면 401 로 응답한다', 응답.status(), 401);
  });
});
