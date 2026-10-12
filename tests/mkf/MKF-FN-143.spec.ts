import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-143',
  name: '자동완성 항목을 누르면 그 상품 상세로 간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);
  const 상세 = new 상품상세화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('상품 목록 화면을 준비한다', async () => {
    await 목록.열기();
  });

  await test.step('상품 목록 첫 화면이 떴는지 확인한다', async () => {
    await 목록.첫화면기다리기();
    await verify('상품 목록 화면에 「쇼핑」 제목이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('상품 검색칸에 「데모」를 적어 자동완성 목록을 펼친다', async () => {
    await 목록.검색칸.pressSequentially('데모');
    await 목록.자동완성항목.first().waitFor();
  });

  await test.step('자동완성 목록이 펼쳐졌는지 확인한다', async () => {
    await verify('자동완성 목록이 펼쳐져 있다', await 목록.자동완성.isVisible(), true, { blocker: true });
  });

  await test.step('자동완성 첫 항목을 누른다', async () => {
    const 항목 = 목록.자동완성항목.first();
    const 이름 = await 항목.innerText();
    const 번호 = await 항목.getAttribute('data-id');
    await 항목.click();
    await 상세.화면기다리기();
    await verify('자동완성 항목을 누르면 그 상품 상세로 간다', new URL(page.url()).pathname === '/shop/' + (번호 ?? '') && (await 상세.제목.innerText()) === 이름, true);
  });
});
