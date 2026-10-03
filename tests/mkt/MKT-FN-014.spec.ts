import { defineCase, test, verify } from '@platform/kit';

import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-014',
  name: '아이디가 영문 소문자 · 숫자 4~12자 규칙에 맞지 않으면 입력칸 아래에 안내가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed: '기획서와 다름 — 차이 D1: 아이디 칸이 12자까지만 받아 13자를 적어도 12자가 되고 안내가 보이지 않는다 (작성 요청 5873)',
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);
  const 안내 = '아이디는 영문 소문자·숫자 4~12자입니다';

  await test.step('회원가입 화면에서 아이디에 대문자가 든 값을 적는다', async () => {
    await 화면.열기();
    await 화면.가입하기버튼().waitFor();
    await 화면.아이디칸().fill('Abcd1234');
    await verify('규칙에 맞지 않는 아이디를 적으면 입력칸 아래에 「아이디는 영문 소문자·숫자 4~12자입니다」가 보인다', await 화면.입력안내(안내).isVisible(), true);
  });

  await test.step('회원가입 화면에서 아이디를 3자로 적는다', async () => {
    await 화면.아이디칸().fill('abc');
    await verify('아이디가 3자면 「아이디는 영문 소문자·숫자 4~12자입니다」가 보인다', await 화면.입력안내(안내).isVisible(), true);
  });

  await test.step('회원가입 화면에서 아이디를 4자로 적는다', async () => {
    await 화면.아이디칸().fill('abcd');
    await verify('아이디가 4자면 「아이디는 영문 소문자·숫자 4~12자입니다」가 보이지 않는다', await 화면.입력안내(안내).isVisible(), false);
  });

  await test.step('회원가입 화면에서 아이디를 12자로 적는다', async () => {
    await 화면.아이디칸().fill('abcd12345678');
    await verify('아이디가 12자면 「아이디는 영문 소문자·숫자 4~12자입니다」가 보이지 않는다', await 화면.입력안내(안내).isVisible(), false);
  });

  await test.step('회원가입 화면에서 아이디를 13자로 적는다', async () => {
    await 화면.아이디칸().fill('abcd123456789');
    await verify(
      '아이디를 13자로 적어도 입력칸에는 12자까지만 들어가고 「아이디는 영문 소문자·숫자 4~12자입니다」가 보이지 않는다',
      [(await 화면.아이디칸().inputValue()).length, await 화면.입력안내(안내).isVisible()],
      [12, false],
    );
  });
});
