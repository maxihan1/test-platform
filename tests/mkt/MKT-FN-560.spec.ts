import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 관리자화면 } from './pages/admin.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-560',
  name: '비회원이 /admin 에 들어가면 로그인 화면으로 간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 관리자 = new 관리자화면(page);
  const 로그인 = new 로그인화면(page);

  await test.step('비회원으로 관리자 화면 /admin 을 연다', async () => {
    await 방해창막기(page);
    await 관리자.열기();
    await verify('비회원이라 머리글에 「로그아웃」이 없다', await 관리자.머리글.로그아웃버튼.count(), 0, { blocker: true });
    await verify('비회원이 /admin 에 들어가면 로그인 화면으로 간다', await 로그인.제목.isVisible(), true);
  });
});
