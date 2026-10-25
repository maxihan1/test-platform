import { defineCase, test, verify } from '@platform/kit';

import { 몸읽기 } from './helpers/my-admin-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-394',
  name: '노출 배너 API 는 노출하는 배너를 순서대로 돌려준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원임을 확인한다', async () => {
    await verify('비회원이다', await 로그인한아이디(request), null, { blocker: true });
  });

  await test.step('GET /api/banners 를 부른다', async () => {
    const 몸 = await 몸읽기<{ items?: { visible: boolean }[] }>(await request.get('/api/banners'));
    const 있음 = await verify('배너가 하나 이상 있다', (몸.items ?? []).length > 0, true);
    const 숨김 = await verify('노출하지 않는 배너는 없다', (몸.items ?? []).filter((줄) => !줄.visible).length, 0);
    await verify('노출 배너 API 는 노출하는 배너를 순서대로 돌려준다', 있음 && 숨김, true);
  });
});
