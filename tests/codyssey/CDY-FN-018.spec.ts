import { defineCase, test, verify } from '@platform/kit';

import { 회원가입팝업 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-018',
  name: '체크박스 하나를 끈 채 두면 「다음」 버튼이 꺼져 있다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '약관 동의 팝업이 열려 있다'],
  params: null,
  expected: null,
  techniques: ['결정 테이블'],
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

  await test.step('「코디세이 이용 약관에 동의합니다.」 · 「개인정보의 수집·이용 및 제3자 제공에 동의합니다.」만 켜고 「응시자격을 확인하였습니다.」는 끈 채 둔다', async () => {
    await 가입.이용약관동의칸.check();
    await 가입.개인정보동의칸.check();
    await verify('체크박스 하나를 끈 채 두면 「다음」 버튼이 꺼져 있다', await 가입.약관다음버튼.isDisabled(), true);
  });
});
