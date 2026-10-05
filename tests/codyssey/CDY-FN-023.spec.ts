import { defineCase, test, verify } from '@platform/kit';

import { 회원가입팝업 } from './pages/signup.page.js';

export const spec = defineCase({
  tcId: 'CDY-FN-023',
  name: '지역 선택 팝업의 「닫기」를 누르면 팝업이 보이지 않는다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '지역 선택 팝업이 열려 있다'],
  params: null,
  expected: null,
  unconfirmed: '화면만 — 기획서 없음 (작성 요청 10779)',
});

test(spec, async ({ page }) => {
  const 가입 = new 회원가입팝업(page);

  await test.step('지역 선택 팝업을 연다', async () => {
    await 가입.지역팝업을연다();
  });

  await test.step('지역 선택 팝업이 열렸는지 확인한다', async () => {
    await 가입.지역팝업제목.waitFor();
    await verify('「지역을 선택해 주세요」 팝업이 보인다', await 가입.지역팝업제목.isVisible(), true, { blocker: true });
  });

  await test.step('팝업의 「닫기」를 누른다', async () => {
    await 가입.지역팝업닫기버튼.click();
    await 가입.지역팝업제목.waitFor({ state: 'hidden' });
    await verify('지역 선택 팝업의 「닫기」를 누르면 팝업이 보이지 않는다', await 가입.지역팝업.isVisible(), false);
  });
});
