import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 설문이뜰때까지시간보내기, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-046',
  name: '만족도 설문을 닫은 뒤 같은 탭에서 홈에 15초 머물러도 설문이 다시 보이지 않는다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 모달들 = new 모달(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 열고 설문이 뜰 때까지 기다린다', async () => {
    await page.clock.install();
    await 방해막기(page, { 설문: false });
    await 홈.열기();
    await 설문이뜰때까지시간보내기(page);
  });

  await test.step('만족도 설문이 보이는지 확인한다', async () => {
    await verify('만족도 설문 모달이 보인다', await 홈.설문창.isVisible(), true, { blocker: true });
  });

  await test.step('만족도 설문을 닫고 같은 탭에서 홈을 다시 열어 15초를 기다린다', async () => {
    await 홈.설문다음에.click();
    await 모달들.배경.waitFor({ state: 'detached' });
    await 홈.열기();
    await 설문이뜰때까지시간보내기(page);
    await verify('만족도 설문을 닫은 뒤 같은 탭에서 홈에 15초 머물러도 설문이 다시 보이지 않는다', await 홈.설문창.isVisible(), false);
  });
});
