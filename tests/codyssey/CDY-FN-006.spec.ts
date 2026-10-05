import { defineCase, test, verify } from '@platform/kit';
import { 홈공지팝업 } from './components/home-popup.component.js';
import { 머리글 } from './components/site-header.component.js';
import { 홈화면 } from './pages/home.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-006',
  name: '머리글의 「로그인」 링크를 누르면 「로그인」 제목이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 팝업 = new 홈공지팝업(page);
  const 로그인 = new 로그인화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.연다();
  });

  await test.step('홈 화면이 열렸는지 확인한다', async () => {
    await 홈.첫제목.waitFor();
    await verify(
      '홈 화면에 「학비와 시간 제약 없이 장학금 받으며 배우는 AI전문인재 과정」 제목이 보인다',
      await 홈.첫제목.isVisible(),
      true,
      { blocker: true },
    );
  });

  await test.step('홈 화면 머리글의 「로그인」 링크를 누른다', async () => {
    await 팝업.모두닫는다();
    await 머리.로그인링크.click();
    await 로그인.제목.waitFor();
    await verify('머리글의 「로그인」 링크를 누르면 「로그인」 제목이 보인다', await 로그인.제목.isVisible(), true);
  });
});
