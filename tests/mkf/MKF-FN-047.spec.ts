import { defineCase, test, verify } from '@platform/kit';

import { 보이는글, 세션아이디, 경로 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-047',
  name: '비밀번호 7자를 적으면 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보인다',
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

  await test.step('회원가입 화면을 연다', async () => {
    await 방해막기(page);
    await 회원가입.열기();
  });

  await test.step('회원가입 화면이 열렸는지 확인한다', async () => {
    await 회원가입.제목.waitFor();
    await verify('회원가입 화면이 열려 있다', 경로(page), 회원가입화면.주소, { blocker: true });
  });

  await test.step('회원가입 비밀번호 칸에 7자 「abcde1!」을 적고 칸을 벗어난다', async () => {
    await 회원가입.적고옮기기(회원가입.비밀번호, 'abcde1!');
    await verify(
      '비밀번호 7자를 적으면 「비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다」가 보인다',
      await 보이는글(회원가입.안내('password')),
      '비밀번호는 영문·숫자·특수문자를 포함해 8~20자입니다',
    );
  });

  await test.step('회원가입 비밀번호 칸에 8자 「abcdef1!」을 적고 칸을 벗어난다', async () => {
    await 회원가입.적고옮기기(회원가입.비밀번호, 'abcdef1!');
    await verify('비밀번호 8자를 적으면 비밀번호 오류 문구가 보이지 않는다', await 보이는글(회원가입.안내('password')), '');
  });

  await test.step('회원가입 비밀번호 칸에 20자를 적고 칸을 벗어난다', async () => {
    await 회원가입.적고옮기기(회원가입.비밀번호, 'abcdefghij12345678!@');
    await verify('비밀번호 20자를 적으면 비밀번호 오류 문구가 보이지 않는다', await 보이는글(회원가입.안내('password')), '');
  });

  await test.step('회원가입 비밀번호 칸에 21자를 적는다', async () => {
    await 회원가입.적기(회원가입.비밀번호, 'abcdefghij12345678!@x');
    await verify('비밀번호 칸에 21자를 적으면 20자까지만 들어간다', (await 회원가입.비밀번호.inputValue()).length, 20);
  });
});
