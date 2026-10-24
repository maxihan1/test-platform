import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'ASH-FN-502',
  name: '/backoffice 를 열면 200 과 HTML 화면이 온다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  await test.step('어드민 키로 어드민 API 가 열리는지 확인한다', async () => {
    await verify('어드민 키가 있다', (await admin.get('/admin/item-templates')).ok(), true, { blocker: true });
  });
  await test.step('/backoffice 를 연다', async () => {
    const 응답 = await admin.get('/backoffice');
    const 코드 = await verify('응답 코드가 200 이다', 응답.status(), 200);
    const 형식 = await verify('응답이 HTML 이다', (응답.headers()['content-type'] ?? '').includes('text/html'), true);
    await verify('/backoffice 를 열면 200 과 HTML 화면이 온다', 코드 && 형식, true);
  });
});
