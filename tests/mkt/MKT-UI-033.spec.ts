import { defineCase, test, verify } from '@platform/kit';

import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-033',
  name: '회원가입 화면에 휴대폰 칸 안내 글자 「숫자만 입력」과 필수 칸 라벨 끝의 필수 표시가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed:
    '기획서와 다름 — 차이 D8·D9: 기획서에 없는 표시가 화면에 있다. 휴대폰 칸에 안내 글자 「숫자만 입력」이 보이고 필수 칸 라벨 끝에 「*」가 붙는다 (작성 요청 5873)',
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('회원가입 화면을 연다', async () => {
    await 화면.열기();
    await 화면.가입하기버튼().waitFor();
    await verify(
      '회원가입 화면의 비어 있는 휴대폰 칸에 안내 글자 「숫자만 입력」이 보인다',
      [await 화면.휴대폰칸().inputValue(), await 화면.휴대폰안내글자()],
      ['', '숫자만 입력'],
    );
    await verify(
      '회원가입 화면의 아이디 · 비밀번호 · 비밀번호 확인 · 이름 · 이메일 라벨 끝에 필수 표시 「*」가 보인다',
      [
        await 화면.필수표시('아이디'),
        await 화면.필수표시('비밀번호'),
        await 화면.필수표시('비밀번호 확인'),
        await 화면.필수표시('이름'),
        await 화면.필수표시('이메일'),
      ],
      ['*', '*', '*', '*', '*'],
    );
  });
});
