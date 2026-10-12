import { defineCase, test, verify } from '@platform/kit';

import { 보이는이름들, 세션아이디, 설문이뜰때까지시간보내기 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-348',
  name: '설문 팝업 「만족도 설문」에 「다음에」 · 「참여하기」 버튼이 보인다',
  precondition: ['설문 팝업을 닫은 적 없는 비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 열고 설문 팝업이 뜨기를 기다린다', async () => {
    await page.clock.install();
    await 방해막기(page, { 설문: false });
    await 홈.열기();
    await 홈.추천카드들.first().waitFor();
    await verify('홈을 연 직후에는 설문 팝업이 보이지 않는다', await 홈.설문창.isVisible(), false, { blocker: true });
    await 설문이뜰때까지시간보내기(page);
    await 홈.설문창.waitFor();
    await verify(
      '설문 팝업 「만족도 설문」에 「다음에」 · 「참여하기」 버튼이 보인다',
      await 보이는이름들({ '「다음에」': 홈.설문다음에, '「참여하기」': 홈.설문참여 }),
      '「다음에」, 「참여하기」',
    );
  });
});
