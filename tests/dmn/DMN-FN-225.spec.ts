import { defineCase, test, verify } from '@platform/kit';

import { 기기지우기, 응답글, 없는번호 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-225',
  name: '없는 기기 번호로 기기를 지우면 404 NOT_FOUND 다',
  apiDoc: 1,
  precondition: ['없는 기기 번호다'],
  params: null,
  expected: null,
});

test(spec, async ({ api }) => {
  const 고객사 = api('데모마켓');

  await test.step('없는 기기 번호로 기기를 지운다', async () => {
    const res = await 기기지우기(고객사, 없는번호('dev'));
    await verify('없는 기기 번호로 기기를 지우면 404 NOT_FOUND 다', await 응답글(res), '404 NOT_FOUND');
  });
});
