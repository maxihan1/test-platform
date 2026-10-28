import { defineCase, test, verify } from '@platform/kit';

import { 응답글, 푸시이력 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-120',
  name: 'page 를 0으로 부르면 400 VALIDATION 이다',
  apiDoc: 1,
  techniques: ['동등 분할'],
  precondition: ['데모마켓 고객사 API 인증이 등록돼 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ api }) => {
  const 고객사 = api('데모마켓');

  await test.step('page 를 0으로 푸시 이력을 부른다', async () => {
    const res = await 푸시이력(고객사, { page: 0 });
    await verify('page 를 0으로 부르면 400 VALIDATION 이다', await 응답글(res), '400 VALIDATION');
  });

  await test.step('상태를 없는 값 「DONE」으로 푸시 이력을 부른다', async () => {
    const res = await 푸시이력(고객사, { status: 'DONE' });
    await verify('없는 상태로 거르면 400 VALIDATION 이다', await 응답글(res), '400 VALIDATION');
  });
});
