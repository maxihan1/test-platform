import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-001',
  name: '홈 머리글에 로고 「데모마켓」, 메뉴 「커뮤니티」 · 「쇼핑」 · 「고객센터」, 로그인 영역과 장바구니 아이콘이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await 홈.머리.메뉴열기();
    const 로고 = await verify('머리글에 로고 「데모마켓」이 보인다', await 홈.머리.로고.isVisible(), true);
    const 커뮤니티 = await verify('머리글에 메뉴 「커뮤니티」가 보인다', await 홈.머리.커뮤니티.isVisible(), true);
    const 쇼핑 = await verify('머리글에 메뉴 「쇼핑」이 보인다', await 홈.머리.쇼핑.isVisible(), true);
    const 고객센터 = await verify('머리글에 메뉴 「고객센터」가 보인다', await 홈.머리.고객센터.isVisible(), true);
    const 로그인 = await verify('머리글에 「로그인」 링크가 보인다', await 홈.머리.로그인.isVisible(), true);
    const 회원가입 = await verify('머리글에 「회원가입」 링크가 보인다', await 홈.머리.회원가입.isVisible(), true);
    const 장바구니 = await verify('머리글에 장바구니 아이콘이 보인다', await 홈.머리.장바구니.isVisible(), true);
    await verify(
      '홈 머리글에 로고 「데모마켓」, 메뉴 「커뮤니티」 · 「쇼핑」 · 「고객센터」, 로그인 영역과 장바구니 아이콘이 보인다',
      로고 && 커뮤니티 && 쇼핑 && 고객센터 && 로그인 && 회원가입 && 장바구니,
      true,
    );
  });
});
