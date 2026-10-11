import { defineCase, test, verify } from '@platform/kit';

import { 새회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-070',
  name: '필수 약관 「(필수) 이용약관 동의」를 끄면 「가입하기」 버튼이 눌리지 않는다',
  precondition: ['회원가입 다른 칸은 맞게 채우고 아이디 중복 확인과 필수 약관 동의를 마쳤다'],
  params: null,
  expected: null,
  techniques: ['결정 테이블'],
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

  await test.step('「(필수) 이용약관 동의」만 끈다', async () => {
    await 회원가입.이용약관동의.uncheck();
    await verify('필수 약관 「(필수) 이용약관 동의」를 끄면 「가입하기」 버튼이 눌리지 않는다', await 회원가입.가입하기.isEnabled(), false);
  });

  await test.step('회원가입 화면을 다시 열어 다른 칸은 맞게 채우고 아이디 중복 확인과 필수 약관 동의를 마친다', async () => {
    await 회원가입.열기();
    await 회원가입.제목.waitFor();
    await 회원가입.가입준비하기(새회원정보());
  });

  await test.step('「가입하기」 버튼이 다시 눌리는 상태인지 확인한다', async () => {
    await verify('다시 채우고 중복 확인과 필수 약관 동의를 마치면 「가입하기」 버튼이 눌린다', await 회원가입.가입하기.isEnabled(), true, { blocker: true });
  });

  await test.step('「(필수) 개인정보 수집 동의」만 끈다', async () => {
    await 회원가입.개인정보동의.uncheck();
    await verify('필수 약관 「(필수) 개인정보 수집 동의」를 끄면 「가입하기」 버튼이 눌리지 않는다', await 회원가입.가입하기.isEnabled(), false);
  });

  await test.step('회원가입 화면을 한 번 더 열어 다른 칸은 맞게 채우고 아이디 중복 확인과 필수 약관 동의를 마친다', async () => {
    await 회원가입.열기();
    await 회원가입.제목.waitFor();
    await 회원가입.가입준비하기(새회원정보());
  });

  await test.step('「가입하기」 버튼이 한 번 더 눌리는 상태인지 확인한다', async () => {
    await verify('한 번 더 채우고 중복 확인과 필수 약관 동의를 마치면 「가입하기」 버튼이 눌린다', await 회원가입.가입하기.isEnabled(), true, { blocker: true });
  });

  await test.step('비밀번호 확인 칸만 비운다', async () => {
    await 회원가입.비밀번호확인.fill('');
    await verify('필수 항목 비밀번호 확인을 비우면 「가입하기」 버튼이 눌리지 않는다', await 회원가입.가입하기.isEnabled(), false);
  });
});
