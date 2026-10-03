import { defineCase, test, verify } from '@platform/kit';

import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-009',
  name: '공지 팝업은 하루 숨김을 체크하고 닫으면 다시 뜨지 않고 체크 없이 닫으면 새로 고칠 때 다시 뜬다',
  precondition: ['홈에 처음 들어온 비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('체크하지 않고 「닫기」를 누른 뒤 홈 화면을 새로 고친다', async () => {
    await 홈.열기();
    await 홈.공지팝업닫기();
    await page.reload();
    await 홈.추천상품카드들().first().waitFor();
    await verify('체크하지 않고 닫으면 새로 고칠 때 공지 팝업이 다시 뜬다', await 홈.공지팝업().isVisible(), true);
  });

  await test.step('「오늘 하루 보지 않기」를 체크하고 「닫기」를 누른 뒤 홈 화면을 다시 연다', async () => {
    await 홈.공지팝업하루숨김체크().check();
    await 홈.공지팝업닫기();
    await 홈.열기();
    await 홈.추천상품카드들().first().waitFor();
    await verify('체크하고 닫은 뒤 같은 날 다시 들어와도 공지 팝업이 뜨지 않는다', await 홈.공지팝업().isVisible(), false);
  });
});
