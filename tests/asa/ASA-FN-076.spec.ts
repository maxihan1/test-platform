import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'ASA-FN-076',
  name: 'GET /backoffice 를 열면 200 과 HTML 화면이 돌아온다',
  apiDoc: 1,
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('GET /backoffice 를 연다', async () => {
    const 응답 = await request.get('/backoffice');
    const 코드 = await verify('GET /backoffice 응답 코드가 200 이다', 응답.status(), 200);
    const 화면 = await verify('GET /backoffice 응답이 HTML 이다', (응답.headers()['content-type'] ?? '').startsWith('text/html'), true);
    await verify('GET /backoffice 를 열면 200 과 HTML 화면이 돌아온다', 코드 && 화면, true);
  });
});
