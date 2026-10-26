import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-062',
  name: '약관에 「(필수) 이용약관 동의」 · 「(필수) 개인정보 수집 동의」 · 「(선택) 마케팅 수신 동의」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);
  await 안내창막기(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 가입.열기();
    await verify('비회원이다', await 가입.머리.로그인.isVisible(), true, { blocker: true });
    await verify('회원가입 화면이 보인다', await 가입.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('회원가입 약관 칸을 확인한다', async () => {
    const 이용 = await verify('약관에 「(필수) 이용약관 동의」가 보인다', await 가입.이용약관동의.isVisible(), true);
    const 개인정보 = await verify('약관에 「(필수) 개인정보 수집 동의」가 보인다', await 가입.개인정보동의.isVisible(), true);
    const 마케팅 = await verify('약관에 「(선택) 마케팅 수신 동의」가 보인다', await 가입.마케팅동의.isVisible(), true);
    await verify('약관에 「(필수) 이용약관 동의」 · 「(필수) 개인정보 수집 동의」 · 「(선택) 마케팅 수신 동의」가 보인다', 이용 && 개인정보 && 마케팅, true);
  });
});
