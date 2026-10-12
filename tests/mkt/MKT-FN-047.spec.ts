import { defineCase, test, verify } from '@platform/kit';

import { 보이는글, 빨간글자인가, 세션아이디, 경로 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-047',
  name: '아이디 칸에 3자를 적으면 「아이디는 영문 소문자·숫자 4~12자입니다」가 빨간 글자로 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
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

  await test.step('회원가입 아이디 칸에 3자 「abc」를 적는다', async () => {
    await 회원가입.적기(회원가입.아이디, 'abc');
    await verify(
      '아이디 칸에 3자를 적으면 「아이디는 영문 소문자·숫자 4~12자입니다」가 빨간 글자로 보인다',
      { 문구: await 보이는글(회원가입.안내('loginId')), 빨강: await 빨간글자인가(회원가입.안내('loginId')) },
      { 문구: '아이디는 영문 소문자·숫자 4~12자입니다', 빨강: true },
    );
  });

  await test.step('회원가입 아이디 칸에 4자 「abc1」을 적는다', async () => {
    await 회원가입.적기(회원가입.아이디, 'abc1');
    await verify('아이디 칸에 4자를 적으면 아이디 칸 아래 오류 글자가 보이지 않는다', await 보이는글(회원가입.안내('loginId')), '');
  });

  await test.step('회원가입 아이디 칸에 12자 「abcdefgh1234」를 적는다', async () => {
    await 회원가입.적기(회원가입.아이디, 'abcdefgh1234');
    await verify('아이디 칸에 12자를 적으면 아이디 칸 아래 오류 글자가 보이지 않는다', await 보이는글(회원가입.안내('loginId')), '');
  });
});
