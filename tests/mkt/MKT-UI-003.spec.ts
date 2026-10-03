import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 공통보충화면 } from './pages/common-misc.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-003',
  name: '없는 주소를 열면 「페이지를 찾을 수 없습니다」와 「홈으로」 버튼이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 공통보충화면(page);

  await test.step('없는 주소를 연다', async () => {
    await 화면.열기('/없는주소');
    await new 머리글(page).장바구니링크().waitFor();
    await verify('없는 주소를 열면 「페이지를 찾을 수 없습니다」가 보인다', await 화면.없는주소제목().isVisible(), true, { blocker: true });
    await verify('「홈으로」 버튼이 보인다', await 화면.홈으로버튼().isVisible(), true);
  });
});
