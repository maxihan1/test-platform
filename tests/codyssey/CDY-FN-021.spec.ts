import { defineCase, test, verify } from '@platform/kit';

import { 회원가입팝업 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-021',
  name: '휴대전화 칸에 숫자 11자를 적으면 11자가 다 들어간다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '회원가입 기본 정보 단계가 열려 있다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
  held: '보류 — 휴대전화 칸은 「본인인증 하기」를 마쳐야 켜진다(locator.fill: element is not enabled)',
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

  await test.step('휴대전화 칸에 숫자 11자를 적는다', async () => {
    await 가입.휴대전화칸.fill('0'.repeat(11));
    await verify('휴대전화 칸에 숫자 11자를 적으면 11자가 다 들어간다', (await 가입.휴대전화칸.inputValue()).length, 11);
  });

  await test.step('휴대전화 칸에 숫자 12자를 적는다', async () => {
    await 가입.휴대전화칸.fill('0'.repeat(12));
    await verify('휴대전화 칸에 숫자 12자를 적으면 11자까지만 들어간다', (await 가입.휴대전화칸.inputValue()).length, 11);
  });
});
