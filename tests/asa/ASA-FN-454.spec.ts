import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'ASA-FN-454',
  name: 'GET /health 요청을 보내면 200 이 돌아온다',
  apiDoc: 2,
  smoke: true,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('GET /health 요청을 보낸다', async () => {
    const 응답 = await request.get('/health');
    await verify('GET /health 요청을 보내면 200 이 돌아온다', 응답.status(), 200);
  });
});
