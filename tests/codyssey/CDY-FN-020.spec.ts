import { defineCase, test, verify } from '@platform/kit';

import { 회원가입팝업 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-020',
  name: '동의를 마치고 「다음」을 누르면 「회원가입」 팝업에 「본인인증 하기」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '약관 동의 팝업이 열려 있다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입팝업(page);

  await test.step('약관 동의 팝업을 연다', async () => {
    await 가입.약관팝업을연다();
  });

  await test.step('약관 동의 팝업이 열렸는지 확인한다', async () => {
    await 가입.약관이전버튼.waitFor();
    await verify('「약관 동의 및 응시자격 확인」 팝업이 보인다', await 가입.약관팝업제목.isVisible(), true, { blocker: true });
  });

  await test.step('체크박스 셋을 모두 켜고 「다음」을 누른다', async () => {
    await 가입.약관세칸을모두켠다();
    await 가입.약관다음을누른다();
    await 가입.기본정보이전버튼.waitFor();
    await verify('동의를 마치고 「다음」을 누르면 「회원가입」 팝업에 「본인인증 하기」 버튼이 보인다', await 가입.본인인증버튼.isVisible(), true);
  });
});
