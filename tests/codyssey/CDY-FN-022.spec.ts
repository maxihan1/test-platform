import { defineCase, test, verify } from '@platform/kit';

import { 회원가입팝업 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-022',
  name: '회원가입 비밀번호 칸에 20자를 적으면 20자가 다 들어간다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '회원가입 기본 정보 단계가 열려 있다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입팝업(page);

  await test.step('회원가입 기본 정보 단계를 연다', async () => {
    await 가입.기본정보단계를연다();
  });

  await test.step('회원가입 기본 정보 단계가 열렸는지 확인한다', async () => {
    await 가입.본인인증버튼.waitFor();
    await verify('「회원가입」 팝업이 보인다', await 가입.기본정보팝업제목.isVisible(), true, { blocker: true });
  });

  await test.step('비밀번호 칸에 20자를 적는다', async () => {
    await 가입.비밀번호칸.fill('a'.repeat(20));
    await verify('회원가입 비밀번호 칸에 20자를 적으면 20자가 다 들어간다', (await 가입.비밀번호칸.inputValue()).length, 20);
  });

  await test.step('비밀번호 칸에 21자를 적는다', async () => {
    await 가입.비밀번호칸.fill('a'.repeat(21));
    await verify('회원가입 비밀번호 칸에 21자를 적으면 20자까지만 들어간다', (await 가입.비밀번호칸.inputValue()).length, 20);
  });
});
