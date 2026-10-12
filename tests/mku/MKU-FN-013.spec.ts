import { defineCase, test, verify } from '@platform/kit';

import { 안내화면 } from './components/notice-screen.component.js';
import { API로그인, 탈퇴, 회원가입, type 회원정보 } from './helpers/account.helper.js';
import { 경로, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-013',
  name: '장바구니 주소에서 로그인 화면으로 보내진 뒤 로그인하면 장바구니 화면으로 돌아간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보: 회원정보 | undefined;
  const 로그인 = new 로그인화면(page);
  const 안내 = new 안내화면(page);

  try {
    await test.step('비회원인지 확인한다', async () => {
      await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
    });

    await test.step('로그인할 임시 회원을 가입시킨다', async () => {
      정보 = await 회원가입(page.request);
    });

    await test.step('장바구니 주소를 열어 로그인 화면으로 간 뒤 로그인한다', async () => {
      await 방해막기(page);
      await page.goto('/cart');
      await 로그인.제목.waitFor();
      await 로그인.로그인하기(정보?.loginId ?? '', 정보?.password ?? '');
      await 안내.제목글('장바구니').waitFor();
      await verify('장바구니 주소에서 로그인 화면으로 보내진 뒤 로그인하면 장바구니 화면으로 돌아간다', 경로(page), '/cart');
    });
  } finally {
    if (정보 !== undefined) {
      await API로그인(page.request, 정보.loginId, 정보.password);
      await 탈퇴(page.request);
    }
  }
});
