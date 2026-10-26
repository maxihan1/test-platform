import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 개인정보처리방침화면 } from './pages/privacy.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-366',
  name: '개인정보처리방침 본문 끝 부칙에 「이 방침은 2026년 9월 27일부터 시행합니다.」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 방침 = new 개인정보처리방침화면(page);
  await 안내창막기(page);

  await test.step('개인정보처리방침 화면을 연다', async () => {
    await 방침.열기();
    await verify('비회원이다', await 방침.머리.로그인.isVisible(), true, { blocker: true });
    await verify('주소가 /privacy 그대로다', 방침.현재경로(), '/privacy', { blocker: true });
    await verify('개인정보처리방침 본문 끝 부칙에 「이 방침은 2026년 9월 27일부터 시행합니다.」가 보인다', await 방침.부칙(), '이 방침은 2026년 9월 27일부터 시행합니다.');
  });
});
