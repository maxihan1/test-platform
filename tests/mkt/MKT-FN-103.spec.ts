import { defineCase, test, verify } from '@platform/kit';

import { 회원가입화면 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-103',
  name: '가입 화면의 이름 · 이메일 · 휴대폰 칸이 규칙에 맞지 않으면 칸 아래에 안내가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  unconfirmed:
    '기획서와 다름 — 차이 D5·D6·D7: 기획서에 없는 입력 안내가 화면에 있다. 이름 · 이메일 · 휴대폰 칸이 규칙에 맞지 않으면 칸 아래에 안내가 나온다 (작성 요청 5873)',
});

test(spec, async ({ page }) => {
  const 화면 = new 회원가입화면(page);

  await test.step('회원가입 화면에서 이름을 1자로 적는다', async () => {
    await 화면.열기();
    await 화면.가입하기버튼().waitFor();
    await 화면.이름칸().fill('가');
    await verify('이름이 2~10자가 아니면 「이름은 2~10자입니다」가 보인다', await 화면.입력안내('이름은 2~10자입니다').isVisible(), true);
  });

  await test.step('회원가입 화면에서 이메일에 이메일 꼴이 아닌 값을 적는다', async () => {
    await 화면.이메일칸().fill('이메일아님');
    await verify('이메일이 이메일 형식이 아니면 「이메일 형식이 올바르지 않습니다」가 보인다', await 화면.입력안내('이메일 형식이 올바르지 않습니다').isVisible(), true);
  });

  await test.step('회원가입 화면에서 휴대폰을 9자로 적는다', async () => {
    await 화면.휴대폰칸().fill('010123456');
    await verify('휴대폰이 숫자 10~11자가 아니면 「휴대폰 번호는 숫자 10~11자입니다」가 보인다', await 화면.입력안내('휴대폰 번호는 숫자 10~11자입니다').isVisible(), true);
  });
});
