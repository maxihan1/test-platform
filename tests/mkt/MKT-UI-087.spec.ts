import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디, 보이는이름들 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-087',
  name: '회원가입 화면에 약관 「(필수) 이용약관 동의」 · 「(필수) 개인정보 수집 동의」 · 「(선택) 마케팅 수신 동의」가 보인다',
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
      '회원가입 화면에 약관 「(필수) 이용약관 동의」 · 「(필수) 개인정보 수집 동의」 · 「(선택) 마케팅 수신 동의」가 보인다',
      await 보이는이름들({ '「(필수) 이용약관 동의」': 회원가입.이용약관동의, '「(필수) 개인정보 수집 동의」': 회원가입.개인정보동의, '「(선택) 마케팅 수신 동의」': 회원가입.마케팅동의 }),
      '「(필수) 이용약관 동의」, 「(필수) 개인정보 수집 동의」, 「(선택) 마케팅 수신 동의」',
    );
  });
});
