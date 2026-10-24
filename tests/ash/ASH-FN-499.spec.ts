import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'ASH-FN-499',
  name: 'QA 서버에 어드민 키를 주고 부르면 어드민 API 가 200 으로 열린다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  await test.step('어드민 키로 어드민 API 가 열리는지 확인한다', async () => {
    await verify('어드민 키가 있다', (await admin.get('/admin/item-templates')).ok(), true, { blocker: true });
  });
  await test.step('어드민 설정을 받는다', async () => {
    const 응답 = await admin.get('/admin/config');
    await verify('QA 서버에 어드민 키를 주고 부르면 어드민 API 가 200 으로 열린다', 응답.status(), 200);
  });
});
