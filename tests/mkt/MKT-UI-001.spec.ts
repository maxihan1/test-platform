import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-001',
  name: '비회원 홈 머리글에 로고 · 메뉴 · 장바구니 아이콘 · 로그인 링크가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);

  await test.step('홈 화면을 연다', async () => {
    await new 홈화면(page).열기();
    await 머리.장바구니링크().waitFor();
    await verify('머리글 왼쪽에 로고 「데모마켓」이 보인다', await 머리.로고().isVisible(), true, { blocker: true });
    await verify(
      '머리글 가운데에 메뉴 「커뮤니티」 「쇼핑」 「고객센터」가 보인다',
      [await 머리.메뉴링크('커뮤니티').isVisible(), await 머리.메뉴링크('쇼핑').isVisible(), await 머리.메뉴링크('고객센터').isVisible()],
      [true, true, true],
    );
    await verify('머리글 오른쪽에 장바구니 아이콘이 보인다', await 머리.장바구니링크().isVisible(), true);
    await verify(
      '머리글 오른쪽에 「로그인」 「회원가입」 링크가 보인다',
      [await 머리.로그인링크().isVisible(), await 머리.회원가입링크().isVisible()],
      [true, true],
    );
    await verify('장바구니 아이콘 옆에 숫자 배지가 보이지 않는다', await 머리.장바구니배지().isVisible(), false);
  });
});
