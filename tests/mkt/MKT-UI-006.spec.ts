import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-006',
  name: '화면 너비 768px 에서는 햄버거 버튼이 보이고 769px 에서는 보이지 않는다',
  precondition: ['화면 너비가 768px 이다', '화면 너비가 769px 이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);

  await test.step('홈 화면을 연다', async () => {
    await page.setViewportSize({ width: 768, height: 900 });
    await 홈.열기();
    await 머리.장바구니링크().waitFor();
    await verify('화면 너비가 768px 이다', await 홈.화면너비(), 768, { blocker: true });
    await verify(
      '화면 너비가 768px 이하면 메뉴가 햄버거 버튼 하나로 접힌다',
      [
        await 머리.햄버거버튼().isVisible(),
        await 홈.주메뉴링크가화면안에있는가('커뮤니티'),
        await 홈.주메뉴링크가화면안에있는가('쇼핑'),
        await 홈.주메뉴링크가화면안에있는가('고객센터'),
      ],
      [true, false, false, false],
    );

    await page.setViewportSize({ width: 769, height: 900 });
    await 홈.열기();
    await 머리.장바구니링크().waitFor();
    await verify('화면 너비가 769px 이다', await 홈.화면너비(), 769, { blocker: true });
    await verify('화면 너비가 769px 이면 햄버거 버튼이 보이지 않는다', await 머리.햄버거버튼().isVisible(), false);
  });
});
