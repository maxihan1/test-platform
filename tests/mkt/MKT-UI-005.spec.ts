import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-005',
  name: '비회원 홈 화면 머리글에 「로그인」 · 「회원가입」 링크가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원으로 홈 화면을 연다', async () => {
    await 방해창막기(page);
    await 홈.열기();
    await verify('홈 화면 제목이 보인다', await 홈.제목.isVisible(), true, { blocker: true });
    await verify(
      '비회원 홈 화면 머리글에 「로그인」 · 「회원가입」 링크가 보인다',
      { 로그인: await 홈.머리글.로그인링크.isVisible(), 회원가입: await 홈.머리글.회원가입링크.isVisible() },
      { 로그인: true, 회원가입: true },
    );
  });
});
