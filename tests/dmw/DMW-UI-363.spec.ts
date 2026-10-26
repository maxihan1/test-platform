import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 개인정보처리방침화면 } from './pages/privacy.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-363',
  name: '개인정보처리방침 화면에 큰 제목 「개인정보처리방침」이 보인다',
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
    await verify('개인정보처리방침 화면에 큰 제목 「개인정보처리방침」이 보인다', await 방침.제목.큰제목.innerText(), '개인정보처리방침');
  });
});
