import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'ASH-FN-502',
  name: '백오피스 주소를 열면 200 이고 HTML 이 온다',
  platforms: ['android'],
  precondition: ['대상 서버가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('대상 서버가 답하는지 확인한다', async () => {
    const 응답 = await request.get('/admin/item-templates');
    await verify('대상 서버가 오류 없이 답한다', 응답.status() < 500, true, { blocker: true });
  });

  await test.step('백오피스 화면 주소를 연다', async () => {
    const 응답 = await request.get('/backoffice');
    const 코드 = await verify('백오피스 응답 코드가 200 이다', 응답.status(), 200);
    const 형식 = await verify('백오피스 응답이 HTML 이다', (응답.headers()['content-type'] ?? '').includes('text/html'), true);
    await verify('백오피스 주소를 열면 200 이고 HTML 이 온다', 코드 && 형식, true);
  });
});
