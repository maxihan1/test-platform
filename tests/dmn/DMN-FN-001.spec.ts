import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'DMN-FN-001',
  name: '데모마켓 인증으로 토큰을 받아 푸시 이력을 부르면 200 이다',
  apiDoc: 1,
  smoke: true,
  precondition: ['데모마켓 고객사 API 인증이 등록돼 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ api }) => {
  const 고객사 = api('데모마켓');

  await test.step('데모마켓 인증으로 푸시 이력을 부른다', async () => {
    const res = await 고객사.get('/v1/pushes', { params: { size: 1 } });
    await verify('데모마켓 인증으로 토큰을 받아 푸시 이력을 부르면 200 이다', res.status(), 200);
  });
});
