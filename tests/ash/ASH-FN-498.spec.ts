import { defineCase, test, verify } from '@platform/kit';

import { 오류 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-498',
  name: '어드민 키 없이 어드민 API 를 부르면 401 「UNAUTHORIZED」다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  await test.step('어드민 키로 어드민 API 가 열리는지 확인한다', async () => {
    await verify('어드민 키가 있다', (await admin.get('/admin/item-templates')).ok(), true, { blocker: true });
  });
  await test.step('어드민 키 없이 어드민 설정을 받는다', async () => {
    const 응답 = await request.get('/admin/config');
    const 코드 = await verify('응답 코드가 401 이다', 응답.status(), 401);
    const 사유 = await verify('오류 코드가 「UNAUTHORIZED」다', (await 오류(응답)).code, 'UNAUTHORIZED');
    await verify('어드민 키 없이 어드민 API 를 부르면 401 「UNAUTHORIZED」다', 코드 && 사유, true);
  });
});
