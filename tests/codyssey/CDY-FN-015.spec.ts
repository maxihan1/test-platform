import { defineCase, test, verify } from '@platform/kit';
import { 로그인상자 } from './components/login.component.js';
import { 로그인화면 } from './pages/login.page.js';
import { 비밀번호재설정화면 } from './pages/password-reset.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-015',
  name: '「비밀번호 찾기」 링크를 누르면 「비밀번호 재설정」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 상자 = new 로그인상자(page);
  const 로그인 = new 로그인화면(page);
  const 재설정 = new 비밀번호재설정화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 상자.연다();
  });

  await test.step('로그인 화면이 열렸는지 확인한다', async () => {
    await 로그인.제목.waitFor();
    await verify('로그인 화면에 「로그인」 제목이 보인다', await 로그인.제목.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 화면에서 「비밀번호 찾기」 링크를 누른다', async () => {
    await 로그인.비밀번호찾기링크.click();
    await 재설정.제목.waitFor();
    await verify('「비밀번호 찾기」 링크를 누르면 「비밀번호 재설정」 제목이 보인다', await 재설정.제목.isVisible(), true);
  });
});
