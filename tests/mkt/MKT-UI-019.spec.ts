import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-019',
  name: '바닥글에 「이용약관」 · 「개인정보처리방침」 링크와 「© 2026 DemoMarket」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 열고 바닥글까지 내린다', async () => {
    await 방해창막기(page);
    await 홈.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
    await 홈.바닥글.그려질때까지();
    await 홈.바닥글.영역.scrollIntoViewIfNeeded();
    await verify(
      '바닥글에 「이용약관」 · 「개인정보처리방침」 링크와 「© 2026 DemoMarket」이 보인다',
      {
        이용약관: await 홈.바닥글.이용약관링크.isVisible(),
        개인정보처리방침: await 홈.바닥글.개인정보링크.isVisible(),
        저작권: await 홈.바닥글.저작권.isVisible(),
      },
      { 이용약관: true, 개인정보처리방침: true, 저작권: true },
    );
  });
});
