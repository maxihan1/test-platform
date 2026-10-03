import { defineCase, test, verify } from '@platform/kit';

import { 홈에서이동한화면 } from './pages/common-links.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-013',
  name: '설문 모달은 「다음에」로 닫으면 다시 뜨지 않고 「참여하기」를 누르면 고객센터로 간다',
  precondition: ['홈에 처음 들어온 비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 시작 = new Date();
  await page.clock.install({ time: 시작 });
  await page.clock.pauseAt(new Date(시작.getTime() + 1000));

  await test.step('설문 모달의 「다음에」를 누른다', async () => {
    await 홈.열기();
    await 홈.추천상품카드들().first().waitFor();
    await page.clock.runFor(15000);
    await 홈.설문다음에버튼().click();
    await page.clock.runFor(300);
    await verify('「다음에」를 누르면 설문 모달이 닫힌다', await 홈.설문모달().isVisible(), false);
  });

  await test.step('설문 모달을 닫은 뒤 홈 화면을 다시 연다', async () => {
    await 홈.열기();
    await 홈.추천상품카드들().first().waitFor();
    await page.clock.runFor(15000);
    await verify('한 번 닫으면 같은 탭에서 설문 모달이 다시 뜨지 않는다', await 홈.설문모달().isVisible(), false);
  });

  await test.step('설문 모달의 「참여하기」를 누른다', async () => {
    const 새탭 = await page.context().newPage();
    const 새탭홈 = new 홈화면(새탭);
    await 새탭홈.열기();
    await 새탭홈.추천상품카드들().first().waitFor();
    await page.clock.runFor(15000);
    await 새탭홈.설문참여버튼().click();
    await new 홈에서이동한화면(새탭).고객센터제목().waitFor();
    await verify('「참여하기」를 누르면 고객센터 화면으로 간다', new URL(새탭.url()).pathname, '/support');
  });
});
