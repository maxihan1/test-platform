import { defineCase, test, verify } from '@platform/kit';

import { 모달 } from './components/modal.component.js';
import { 설문이뜰때까지시간보내기, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-047',
  name: '만족도 설문에서 「다음에」를 누르면 설문 모달이 보이지 않는다',
  precondition: ['처음 방문한 브라우저다'],
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

  await test.step('만족도 설문에서 「다음에」를 누른다', async () => {
    await 홈.설문다음에.click();
    await 모달들.배경.waitFor({ state: 'detached' });
    await verify('만족도 설문에서 「다음에」를 누르면 설문 모달이 보이지 않는다', await 홈.설문창.isVisible(), false);
  });
});
