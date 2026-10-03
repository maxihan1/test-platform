import { defineCase, test, verify } from '@platform/kit';

import { 쿠키띠 } from './components/cookie-bar.component.js';
import { 머리글 } from './components/header.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-003',
  name: '쿠키 안내 띠의 「동의」를 누르면 띠가 사라지고 화면을 새로 열어도 다시 보이지 않는다',
  precondition: ['처음 방문한 비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 쿠키 = new 쿠키띠(page);

  await test.step('쿠키 안내 띠의 「동의」를 누른다', async () => {
    await 홈.열기();
    await 홈.공지팝업닫기();
    await 쿠키.동의버튼().click();
    await verify('「동의」를 누르면 쿠키 안내 띠가 사라진다', await 쿠키.영역().isVisible(), false);
  });

  await test.step('「동의」를 누른 뒤 화면을 새로 연다', async () => {
    await 홈.열기();
    await new 머리글(page).장바구니링크().waitFor();
    await verify('동의한 뒤 화면을 새로 열어도 쿠키 안내 띠가 다시 보이지 않는다', await 쿠키.영역().isVisible(), false);
  });
});
