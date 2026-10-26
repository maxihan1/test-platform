import { defineCase, test, verify } from '@platform/kit';

import { 몸읽기 } from './helpers/my-admin-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-397',
  name: '설정 조회 API 는 공지 팝업 켜짐 여부를 돌려준다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원임을 확인한다', async () => {
    await verify('비회원이다', await 로그인한아이디(request), null, { blocker: true });
  });

  await test.step('GET /api/settings 를 부른다', async () => {
    const 몸 = await 몸읽기<{ noticePopup?: unknown }>(await request.get('/api/settings'));
    await verify('설정 조회 API 는 공지 팝업 켜짐 여부를 돌려준다', typeof 몸.noticePopup, 'boolean');
  });
});
