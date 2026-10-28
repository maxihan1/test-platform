import { defineCase, test, verify } from '@platform/kit';

import { 새회원아이디, 응답글, 푸시보내기 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'DMN-FN-048',
  name: '기기가 한 번도 등록된 적 없는 회원에게 푸시를 보내면 422 NO_DEVICE 다',
  apiDoc: 1,
  techniques: ['동등 분할'],
  precondition: ['기기가 없는 새 회원 아이디다'],
  params: null,
  expected: null,
});

test(spec, async ({ api }) => {
  const 고객사 = api('데모마켓');

  await test.step('기기가 없는 회원에게 푸시를 보낸다', async () => {
    const res = await 푸시보내기(고객사, { userId: 새회원아이디(), title: '기기 없음', body: '등록된 기기가 없는 회원' });
    await verify('기기가 한 번도 등록된 적 없는 회원에게 푸시를 보내면 422 NO_DEVICE 다', await 응답글(res), '422 NO_DEVICE');
  });
});
