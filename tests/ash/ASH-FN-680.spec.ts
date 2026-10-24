import { defineCase, test, verify } from '@platform/kit';

import { 오류 } from './helpers/api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-680',
  name: 'QA 가 아닌 서버에서 어드민 API 를 부르면 404 「ADMIN_DISABLED」다',
  platforms: ['android'],
  precondition: ['QA 가 아닌 서버가 있다'],
  techniques: ['동등 분할'],
  held: '보류 — QA 가 아닌 서버가 없음',
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  await test.step('서버가 떠 있는지 확인한다', async () => {
    await verify('QA 가 아닌 서버가 있다', (await request.get('/health')).ok(), true, { blocker: true });
  });
  await test.step('어드민 설정을 받는다', async () => {
    const 응답 = await admin.get('/admin/config');
    const 코드 = await verify('응답 코드가 404 다', 응답.status(), 404);
    const 사유 = await verify('오류 코드가 「ADMIN_DISABLED」다', (await 오류(응답)).code, 'ADMIN_DISABLED');
    await verify('QA 가 아닌 서버에서 어드민 API 를 부르면 404 「ADMIN_DISABLED」다', 코드 && 사유, true);
  });
});
