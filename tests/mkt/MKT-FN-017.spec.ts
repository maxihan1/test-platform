import { defineCase, test, verify } from '@platform/kit';

import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-017',
  name: '휴대폰 칸은 숫자만 받고 이름 · 이메일 · 휴대폰이 규칙에 맞지 않으면 「가입하기」 버튼이 눌리지 않는다',
  precondition: ['비회원이다', '다른 필수 항목을 모두 채우고 필수 약관에 동의했다', '아이디 중복 확인을 마쳤다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);
  const 아이디 = `mk${Date.now().toString(36)}`.slice(0, 12);
  const 비밀번호 = `Mk!${Date.now().toString(36)}1`;
  const 이메일 = `${아이디}@demo.market`;

  await test.step('휴대폰 칸에 숫자와 문자가 섞인 값을 적는다', async () => {
    await 화면.열기();
    await 화면.가입하기버튼().waitFor();
    await 화면.휴대폰칸().fill('01a02b03c');
    await verify('휴대폰 칸에는 숫자 외의 글자가 입력되지 않는다', await 화면.휴대폰칸().inputValue(), '010203');
  });

  await test.step('다른 필수 항목을 모두 채우고 필수 약관에 동의한 뒤 아이디 중복 확인을 마친다', async () => {
    await 화면.필수항목채우기(아이디, 비밀번호, '임시회원', 이메일);
    await 화면.휴대폰칸().fill('01012345678');
    await 화면.필수약관동의하기();
    await 화면.중복확인하기();
    await 화면.중복확인버튼().waitFor();
    await verify('필수 항목을 모두 채우고 필수 약관에 동의한 뒤 아이디 중복 확인을 마치면 「가입하기」 버튼이 눌린다', await 화면.가입하기버튼().isEnabled(), true, { blocker: true });
  });

  await test.step('이름을 1자로 적는다', async () => {
    await 화면.이름칸().fill('가');
    await verify('이름이 1자면 「가입하기」 버튼이 눌리지 않는다', await 화면.가입하기버튼().isEnabled(), false);
    await 화면.이름칸().fill('임시회원');
  });

  await test.step('이메일에 이메일 꼴이 아닌 값을 적는다', async () => {
    await 화면.이메일칸().fill('이메일아님');
    await verify('이메일이 이메일 형식이 아니면 「가입하기」 버튼이 눌리지 않는다', await 화면.가입하기버튼().isEnabled(), false);
    await 화면.이메일칸().fill(이메일);
  });

  await test.step('휴대폰을 9자로 적는다', async () => {
    await 화면.휴대폰칸().fill('010123456');
    await verify('휴대폰이 9자면 「가입하기」 버튼이 눌리지 않는다', await 화면.가입하기버튼().isEnabled(), false);
  });
});
