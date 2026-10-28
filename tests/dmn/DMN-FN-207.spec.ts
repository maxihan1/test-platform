import { defineCase, test, verify } from '@platform/kit';

import { 응답글, 없는번호, 푸시조회 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-207',
  name: '없는 푸시 번호로 푸시를 조회하면 404 NOT_FOUND 다',
  apiDoc: 1,
  precondition: ['없는 푸시 번호다'],
  params: null,
  expected: null,
});

test(spec, async ({ api }) => {
  const 고객사 = api('데모마켓');

  await test.step('없는 푸시 번호로 푸시를 조회한다', async () => {
    const res = await 푸시조회(고객사, 없는번호('psh'));
    await verify('없는 푸시 번호로 푸시를 조회하면 404 NOT_FOUND 다', await 응답글(res), '404 NOT_FOUND');
  });
});
