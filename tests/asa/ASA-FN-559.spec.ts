import { defineCase, test, verify } from '@platform/kit';

import { 어드민부르기 } from './helpers/admin.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-559',
  name: '불꽃 군주의 폐허 월드를 초기화하면 200 이 돌아온다',
  apiDoc: 1,
  precondition: ['어드민 키가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  await test.step('불꽃 군주의 폐허 월드를 초기화한다', async () => {
    const 응답 = await 어드민부르기(admin, 'POST', '/admin/world/reset', {
      zone: 'Boss',
    });
    await verify('불꽃 군주의 폐허 월드를 초기화하면 200 이 돌아온다', 응답.status(), 200);
  });
});
