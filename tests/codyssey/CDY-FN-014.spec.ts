import { defineCase, test, verify } from '@platform/kit';
import { 로그인상자 } from './components/login.component.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-014',
  name: '「회원가입」 버튼을 누르면 「지역을 선택해 주세요」 팝업이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 상자 = new 로그인상자(page);
  const 로그인 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 상자.연다();
  });

  await test.step('로그인 화면이 열렸는지 확인한다', async () => {
    await 로그인.제목.waitFor();
    await verify('로그인 화면에 「로그인」 제목이 보인다', await 로그인.제목.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 화면에서 「회원가입」 버튼을 누른다', async () => {
    await 로그인.회원가입버튼.click();
    await 로그인.지역선택팝업제목.waitFor();
    await verify('「회원가입」 버튼을 누르면 「지역을 선택해 주세요」 팝업이 보인다', await 로그인.지역선택팝업제목.isVisible(), true);
  });
});
