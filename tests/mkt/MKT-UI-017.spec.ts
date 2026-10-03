import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 공통보충화면 } from './pages/common-misc.page.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-017',
  name: '회원가입 화면의 입력칸마다 이름표가 연결돼 있다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 공통보충화면(page);

  await test.step('회원가입 화면을 연다', async () => {
    await new 회원가입화면(page).열기();
    await 화면.회원가입제목().waitFor();
    await new 머리글(page).장바구니링크().waitFor();
    await verify(
      '회원가입 화면의 입력칸마다 이름표가 연결돼 있다',
      [(await 화면.보이는입력칸수()) > 0, await 화면.이름표없는입력칸수()],
      [true, 0],
    );
  });
});
