import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-185',
  name: '펼친 상품 문의 질문을 다시 누르면 답변이 보이지 않는다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('상품 상세 화면을 준비한다', async () => {
    await 상세.열기(1);
  });

  await test.step('상품 상세 화면이 떴는지 확인한다', async () => {
    await 상세.화면기다리기();
    await verify('상품 상세 화면에 상품 이름 제목이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
  });

  await test.step('상품 문의 탭을 연다', async () => {
    await 상세.문의탭.click();
  });

  await test.step('상품 문의 질문이 보이는지 확인한다', async () => {
    await verify('상품 문의 질문이 보인다', await 상세.질문들.first().isVisible(), true, { blocker: true });
  });

  await test.step('첫 질문을 펼친다', async () => {
    await 상세.질문들.first().click();
  });

  await test.step('첫 질문의 답변이 펼쳐졌는지 확인한다', async () => {
    await verify('첫 질문의 답변이 보인다', await 상세.답변이보이는가(상세.질문들.first()), true, { blocker: true });
  });

  await test.step('펼친 상품 문의 질문을 다시 누른다', async () => {
    const 질문 = 상세.질문들.first();
    await 질문.click();
    await verify('펼친 상품 문의 질문을 다시 누르면 답변이 보이지 않는다', await 상세.답변이보이는가(질문), false);
  });
});
