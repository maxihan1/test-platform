import { defineCase, test, verify } from '@platform/kit';

import { 보이는이름들, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-081',
  name: '회원가입 화면에 이름 · 이메일 · 휴대폰 · 생년월일 입력칸이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 회원가입 = new 회원가입화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('회원가입 화면을 연다', async () => {
    await 방해막기(page);
    await 회원가입.열기();
    await 회원가입.제목.waitFor();
    await verify(
      '회원가입 화면에 이름 · 이메일 · 휴대폰 · 생년월일 입력칸이 보인다',
      await 보이는이름들({ '이름 입력칸': 회원가입.이름, '이메일 입력칸': 회원가입.이메일, '휴대폰 입력칸': 회원가입.휴대폰, '생년월일 입력칸': 회원가입.생년월일 }),
      '이름 입력칸, 이메일 입력칸, 휴대폰 입력칸, 생년월일 입력칸',
    );
  });
});
