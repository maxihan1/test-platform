import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-061',
  name: '이메일을 비우면 「가입하기」 버튼이 눌리지 않는다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 회원가입 = new 회원가입화면(page);

  await test.step('회원가입 화면에서 다른 칸은 맞게 채우고 아이디 중복 확인과 필수 약관 동의를 마친다', async () => {
    await 방해막기(page);
    await 회원가입.열기();
    await 회원가입.제목.waitFor();
    await 회원가입.가입준비하기(새회원정보());
  });

  await test.step('「가입하기」 버튼이 눌리는 상태인지 확인한다', async () => {
    await verify('다른 칸을 맞게 채우고 중복 확인과 필수 약관 동의를 마치면 「가입하기」 버튼이 눌린다', await 회원가입.가입하기.isEnabled(), true, { blocker: true });
  });

  await test.step('이메일만 비우고 나머지 필수 항목과 약관을 채운다', async () => {
    await 회원가입.이메일.fill('');
    await verify('이메일을 비우면 「가입하기」 버튼이 눌리지 않는다', await 회원가입.가입하기.isEnabled(), false);
  });

  await test.step('이메일만 「abc」로 두고 나머지 필수 항목과 약관을 채운다', async () => {
    await 회원가입.이메일.fill('abc');
    await verify('이메일을 「abc」로 적으면 「가입하기」 버튼이 눌리지 않는다', await 회원가입.가입하기.isEnabled(), false);
  });
});
