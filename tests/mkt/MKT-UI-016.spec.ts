import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 공통보충화면 } from './pages/common-misc.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-016',
  name: '화면 오른쪽 아래에 상담 버튼이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 화면 = new 공통보충화면(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.열기();
    await new 머리글(page).장바구니링크().waitFor();
    const 위치 = await 홈.화면중심기준위치(화면.상담버튼());
    await verify('화면 오른쪽 아래에 상담 버튼이 보인다', [await 화면.상담버튼().isVisible(), 위치.가로 > 0, 위치.세로 > 0], [true, true, true]);
  });
});
