import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보 } from './helpers/account.helper.js';
import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-061',
  name: '필수 약관 하나를 끄면 「가입하기」 버튼이 꺼져 있다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['결정 테이블'],
});

test(spec, async ({ page }) => {
  const 회원가입 = new 회원가입화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('회원가입 화면에서 다른 칸은 맞게 채우고 아이디 중복 확인과 필수 약관 동의를 마친다', async () => {
    await 방해막기(page);
    await 회원가입.열기();
    await 회원가입.제목.waitFor();
    await 회원가입.가입준비하고기다리기(새회원정보());
    await verify('다른 칸을 맞게 채우고 중복 확인과 필수 약관 동의를 마치면 「가입하기」 버튼이 켜진다', await 회원가입.가입하기.isEnabled(), true, { blocker: true });
  });

  await test.step('필수 약관 「(필수) 개인정보 수집 동의」만 끈 채 나머지를 다 채운다', async () => {
    await 회원가입.개인정보동의.uncheck();
    await verify('필수 약관 하나를 끄면 「가입하기」 버튼이 꺼져 있다', await 회원가입.가입하기.isEnabled(), false);
  });

  await test.step('회원가입 화면을 다시 열어 다른 칸은 맞게 채우고 아이디 중복 확인과 필수 약관 동의를 마친다', async () => {
    await 회원가입.열기();
    await 회원가입.제목.waitFor();
    await 회원가입.가입준비하고기다리기(새회원정보());
    await verify('다시 채우고 중복 확인과 필수 약관 동의를 마치면 「가입하기」 버튼이 켜진다', await 회원가입.가입하기.isEnabled(), true, { blocker: true });
  });

  await test.step('이름 칸만 비운 채 나머지를 다 채운다', async () => {
    await 회원가입.이름.fill('');
    await verify('필수 칸 이름을 비우면 「가입하기」 버튼이 꺼져 있다', await 회원가입.가입하기.isEnabled(), false);
  });
});
