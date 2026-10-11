import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'MKT-FN-276',
  name: 'GET /api/products 응답의 content-type 이 JSON 이다',
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('GET /api/products 를 부른다', async () => {
    const res = await request.get('/api/products');
    await verify('GET /api/products 응답의 content-type 이 JSON 이다', (res.headers()['content-type'] ?? '').includes('application/json'), true);
  });

  await test.step('JSON 본문으로 POST /api/auth/find-password 를 부른다', async () => {
    const res = await request.post('/api/auth/find-password', { data: { loginId: 'no-such-user', email: 'no-such-user@example.com' } });
    await verify('JSON 본문으로 POST /api/auth/find-password 를 보내면 JSON 응답이 온다', (res.headers()['content-type'] ?? '').includes('application/json'), true);
  });
});
