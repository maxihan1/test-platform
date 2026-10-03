import { defineCase, test, verify } from '@platform/kit';
import { 로그인화면 } from './pages/login.page.js';
import { 비밀번호찾기화면 } from './pages/password-find.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-014',
  name: '로그인 화면에서 「비밀번호 찾기」를 누르면 제목 「비밀번호 재설정」 화면이 열린다',
  precondition: ['비회원이다'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 로그인화면(page);
  const 찾기화면 = new 비밀번호찾기화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 화면.연다();
  });

  await test.step('로그인 화면의 「비밀번호 찾기」 링크를 확인한다', async () => {
    await 화면.제목.waitFor();
    await verify('로그인 화면에 「비밀번호 찾기」 링크가 보인다', await 화면.비밀번호찾기링크.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 화면에서 「비밀번호 찾기」를 누른다', async () => {
    await 화면.비밀번호찾기를누른다();
    await 찾기화면.제목.waitFor();
    await verify('로그인 화면에서 「비밀번호 찾기」를 누르면 제목 「비밀번호 재설정」 화면이 열린다', await 찾기화면.제목.isVisible(), true);
  });
});
