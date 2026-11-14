import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 알림머리말화면 } from './pages/notifications-header.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-486',
  name: '비회원이 알림 주소를 열면 「이 정보에 접근하려면 로그인을 해야 합니다.」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});
test(spec, async ({ page }) => {
  const 알림 = new 알림머리말화면(page);

  await test.step('비회원으로 알림 주소를 연다', async () => {
    await 한국어로(page);
    await 알림.열기();
    const 떴다 = await 알림.안내('이 정보에 접근하려면 로그인을 해야 합니다.').waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('비회원이 알림 주소를 열면 「이 정보에 접근하려면 로그인을 해야 합니다.」가 보인다', 떴다, true);
  });
});
