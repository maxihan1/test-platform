import { defineCase, test, verify } from '@platform/kit';
import { 로그인화면 } from './pages/login.page.js';
import { 비밀번호재설정화면 } from './pages/password-reset.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-025',
  name: '「취소하기」를 누르면 「로그인」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 재설정 = new 비밀번호재설정화면(page);
  const 로그인 = new 로그인화면(page);

  await test.step('비밀번호 재설정 화면을 연다', async () => {
    await 재설정.연다();
  });

  await test.step('비밀번호 재설정 화면이 열렸는지 확인한다', async () => {
    await 재설정.제목.waitFor();
    await verify('비밀번호 재설정 화면에 「비밀번호 재설정」 제목이 보인다', await 재설정.제목.isVisible(), true, { blocker: true });
  });

  await test.step('비밀번호 재설정 화면에서 「취소하기」를 누른다', async () => {
    await 재설정.취소링크.click();
    await 로그인.제목.waitFor();
    await verify('「취소하기」를 누르면 「로그인」 제목이 보인다', await 로그인.제목.isVisible(), true);
  });
});
