import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-063',
  name: '「전체 동의」를 켜면 약관 셋이 모두 체크된다',
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

  await test.step('「전체 동의」를 켠다', async () => {
    await 가입.전체동의.check();
    const 이용 = await verify('「(필수) 이용약관 동의」가 체크된다', await 가입.이용약관동의.isChecked(), true);
    const 개인정보 = await verify('「(필수) 개인정보 수집 동의」가 체크된다', await 가입.개인정보동의.isChecked(), true);
    const 마케팅 = await verify('「(선택) 마케팅 수신 동의」가 체크된다', await 가입.마케팅동의.isChecked(), true);
    await verify('「전체 동의」를 켜면 약관 셋이 모두 체크된다', 이용 && 개인정보 && 마케팅, true);
  });
});
