import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/account.helper.js';
import { 새가입값 } from './helpers/member.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-025',
  name: '아이디에 대문자를 넣으면 「아이디는 영문 소문자·숫자 4~12자입니다」 가 보인다',
  platforms: ['desktop'],
  precondition: [
    '회원가입 화면을 열었다',
  ],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입화면(page);
  const 값 = 새가입값();

  await 방해막기(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 가입.열기();
    await verify('회원가입 화면에 「가입하기」 버튼이 보인다', await 가입.가입하기버튼.isVisible(), true, { blocker: true });
  });

  await test.step('아이디 칸에 대문자가 든 아이디를 적는다', async () => {
    await 가입.아이디칸.fill('ABCDE');
    await verify('아이디에 대문자를 넣으면 「아이디는 영문 소문자·숫자 4~12자입니다」 가 보인다', await 가입.안내문구('loginId').innerText(), '아이디는 영문 소문자·숫자 4~12자입니다');
  });

  await test.step('비밀번호 칸에 영문만 8자를 적는다', async () => {
    await 가입.비밀번호칸.fill('abcdefgh');
    await verify('비밀번호를 영문만으로 적으면 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」 가 보인다', await 가입.안내문구('password').innerText(), '비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다');
  });

  await test.step('비밀번호 확인 칸에 다른 비밀번호를 적는다', async () => {
    await 가입.비밀번호칸.fill(값.비밀번호);
    await 가입.비밀번호확인칸.fill('other#pass2026');
    await verify('비밀번호 확인을 다르게 적으면 「비밀번호가 일치하지 않습니다」 가 보인다', await 가입.안내문구('passwordConfirm').innerText(), '비밀번호가 일치하지 않습니다');
  });

  await test.step('이름만 비우고 나머지 칸과 약관을 채운다', async () => {
    await 가입.모두채우기(값);
    await verify('다른 칸과 약관을 모두 채우면 「가입하기」 가 눌린다', await 가입.가입하기버튼.isEnabled(), true, { blocker: true });
    await 가입.이름칸.fill('');
    await verify('이름을 비우면 다른 칸을 다 채워도 「가입하기」 가 눌리지 않는다', await 가입.가입하기버튼.isDisabled(), true);
  });

  await test.step('이메일을 형식에 맞지 않게 적고 나머지 칸과 약관을 채운다', async () => {
    await 가입.이름칸.fill(값.이름);
    await verify('다른 칸과 약관을 모두 채우면 「가입하기」 가 눌린다', await 가입.가입하기버튼.isEnabled(), true, { blocker: true });
    await 가입.이메일칸.fill('abc');
    await verify('이메일을 형식에 맞지 않게 적으면 다른 칸을 다 채워도 「가입하기」 가 눌리지 않는다', await 가입.가입하기버튼.isDisabled(), true);
  });

  await test.step('휴대폰 칸에 「010-12ab」 를 적는다', async () => {
    await 가입.휴대폰칸.fill('010-12ab');
    await verify('휴대폰 칸에 「010-12ab」 를 적으면 숫자 「01012」 만 남는다', await 가입.휴대폰칸.inputValue(), '01012');
  });
});
