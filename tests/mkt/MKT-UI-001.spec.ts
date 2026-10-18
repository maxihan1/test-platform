import { defineCase, test, verify } from '@platform/kit';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-001',
  name: '홈 화면 머리글에 로고 「데모마켓」 · 메뉴 「커뮤니티」 · 「쇼핑」 · 「고객센터」 · 로그인 영역 · 장바구니 아이콘이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 방해창막기(page);
    await 홈.열기();
    await verify('머리글에 「로그인」 링크가 보인다', await 홈.머리글.로그인링크.isVisible(), true, { blocker: true });
    await 홈.머리글.좁으면메뉴열기();
    await verify(
      '홈 화면 머리글에 로고 「데모마켓」 · 메뉴 「커뮤니티」 · 「쇼핑」 · 「고객센터」 · 로그인 영역 · 장바구니 아이콘이 보인다',
      {
        로고: await 홈.머리글.로고.isVisible(),
        커뮤니티: await 홈.머리글.메뉴('커뮤니티').isVisible(),
        쇼핑: await 홈.머리글.메뉴('쇼핑').isVisible(),
        고객센터: await 홈.머리글.메뉴('고객센터').isVisible(),
        로그인영역: (await 홈.머리글.로그인링크.isVisible()) && (await 홈.머리글.회원가입링크.isVisible()),
        장바구니: await 홈.머리글.장바구니링크.isVisible(),
      },
      { 로고: true, 커뮤니티: true, 쇼핑: true, 고객센터: true, 로그인영역: true, 장바구니: true },
    );
  });
});
