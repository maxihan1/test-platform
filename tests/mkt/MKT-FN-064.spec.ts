import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디, 경로 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-064',
  name: '「전체 동의」를 켜면 약관 체크박스 셋이 모두 켜진다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 회원가입 = new 회원가입화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('회원가입을 연다', async () => {
    await 방해막기(page);
    await 회원가입.열기();
  });

  await test.step('회원가입 화면이 열렸는지 확인한다', async () => {
    await 회원가입.제목.waitFor();
    await verify('회원가입 화면이 열려 있다', 경로(page), 회원가입화면.주소, { blocker: true });
  });

  await test.step('「전체 동의」를 켠다', async () => {
    await 회원가입.전체동의.check();
    await verify(
      '「전체 동의」를 켜면 약관 체크박스 셋이 모두 켜진다',
      { 이용약관: await 회원가입.이용약관동의.isChecked(), 개인정보: await 회원가입.개인정보동의.isChecked(), 마케팅: await 회원가입.마케팅동의.isChecked() },
      { 이용약관: true, 개인정보: true, 마케팅: true },
    );
  });
});
