import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-014',
  name: '「오늘 하루 보지 않기」를 체크하고 닫으면 공지 팝업이 다시 뜨지 않는다',
  platforms: ['desktop'],
  precondition: ['처음 방문한 비회원이다', '홈에 공지 팝업이 떠 있다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 팝업이뜬다 = async (): Promise<boolean> =>
    홈.공지팝업.waitFor({ state: 'visible', timeout: 3000 }).then(
      () => true,
      () => false,
    );

  await test.step('홈 화면을 열고 공지 팝업이 떠 있는지 확인한다', async () => {
    await 홈.쿠키띠를치운다();
    await 홈.설문을치운다();
    await 홈.열기();
    await verify('홈에 공지 팝업이 떠 있다', await 팝업이뜬다(), true, { blocker: true });
  });

  await test.step('체크하지 않고 「닫기」를 누른 뒤 화면을 새로 고친다', async () => {
    await 홈.공지닫기.click();
    await 홈.공지팝업.waitFor({ state: 'detached' });
    await 홈.다시열고설정응답을기다린다();
    await verify('체크하지 않고 닫으면 새로 고칠 때 공지 팝업이 다시 뜬다', await 팝업이뜬다(), true);
  });

  await test.step('「오늘 하루 보지 않기」를 체크하고 「닫기」를 누른 뒤 홈 화면을 다시 연다', async () => {
    await 홈.공지체크.check();
    await 홈.공지닫기.click();
    await 홈.공지팝업.waitFor({ state: 'detached' });
    await 홈.다시열고설정응답을기다린다();
    await 홈.추천카드.first().waitFor();
    await verify('「오늘 하루 보지 않기」를 체크하고 닫으면 같은 날 다시 들어와도 공지 팝업이 뜨지 않는다', await 홈.공지팝업.isVisible(), false);
  });
});
