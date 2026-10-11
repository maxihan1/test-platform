import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/account.helper.js';
import { 새가입값 } from './helpers/member.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-023',
  name: '아이디를 3자로 적으면 「아이디는 영문 소문자·숫자 4~12자입니다」 가 빨간 글자로 보인다',
  platforms: ['desktop'],
  precondition: [
    '회원가입 화면을 열었다',
  ],
  techniques: ['경계값 분석'],
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

  await test.step('아이디 칸에 3자를 적는다', async () => {
    await 가입.아이디칸.fill('abc');
    await verify(
      '아이디를 3자로 적으면 「아이디는 영문 소문자·숫자 4~12자입니다」 가 빨간 글자로 보인다',
      { 문구: await 가입.안내문구('loginId').innerText(), 빨간글자: await 가입.빨간글자인가('loginId') },
      { 문구: '아이디는 영문 소문자·숫자 4~12자입니다', 빨간글자: true },
    );
  });

  await test.step('아이디 칸에 4자를 적는다', async () => {
    await 가입.아이디칸.fill('abcd');
    await verify('아이디를 4자로 적으면 아이디 오류 문구가 보이지 않는다', await 가입.안내문구('loginId').isVisible(), false);
  });

  await test.step('아이디 칸에 12자를 적는다', async () => {
    await 가입.아이디칸.fill('abcdefghijkl');
    await verify('아이디를 12자로 적으면 아이디 오류 문구가 보이지 않는다', await 가입.안내문구('loginId').isVisible(), false);
  });

  await test.step('비밀번호 칸에 7자를 적는다', async () => {
    await 가입.비밀번호칸.fill('abcd12!');
    await verify('비밀번호를 7자로 적으면 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」 가 보인다', await 가입.안내문구('password').innerText(), '비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다');
  });

  await test.step('비밀번호 칸에 8자를 적는다', async () => {
    await 가입.비밀번호칸.fill('abcde12!');
    await verify('비밀번호를 8자로 적으면 비밀번호 오류 문구가 보이지 않는다', await 가입.안내문구('password').isVisible(), false);
  });

  await test.step('비밀번호 칸에 20자를 적는다', async () => {
    await 가입.비밀번호칸.fill('abcdefghijklmnop12!@');
    await verify('비밀번호를 20자로 적으면 비밀번호 오류 문구가 보이지 않는다', await 가입.안내문구('password').isVisible(), false);
  });

  await test.step('이름을 1자로 적고 나머지 칸과 약관을 채운다', async () => {
    await 가입.모두채우기(값);
    await verify('다른 칸과 약관을 모두 채우면 「가입하기」 가 눌린다', await 가입.가입하기버튼.isEnabled(), true, { blocker: true });
    await 가입.이름칸.fill('가');
    await verify('이름을 1자로 적으면 다른 칸을 다 채워도 「가입하기」 가 눌리지 않는다', await 가입.가입하기버튼.isDisabled(), true);
  });

  await test.step('이름 칸에 2자를 적는다', async () => {
    await 가입.이름칸.fill('가나');
    await verify('이름을 2자로 적으면 이름 오류 문구가 보이지 않는다', await 가입.안내문구('name').isVisible(), false);
  });

  await test.step('이름 칸에 10자를 적는다', async () => {
    await 가입.이름칸.fill('가나다라마바사아자차');
    await verify('이름을 10자로 적으면 이름 오류 문구가 보이지 않는다', await 가입.안내문구('name').isVisible(), false);
  });
});
