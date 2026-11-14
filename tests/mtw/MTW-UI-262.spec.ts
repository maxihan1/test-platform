import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 로그인전화면 } from './pages/landing.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-262',
  name: '로그인 전 왼쪽 하단에 「이용 약관」 링크가 없다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 전 = new 로그인전화면(page);

  await test.step('로그인 전 화면을 연다', async () => {
    await 한국어로(page);
    await 전.열기();
    await verify('로그인 전 왼쪽 하단에 「개인정보처리방침」이 보인다', await 전.개인정보처리방침.isVisible(), true, { blocker: true });
    await verify('로그인 전 왼쪽 하단에 「이용 약관」 링크가 없다', await 전.이용약관.count(), 0);
  });
});
