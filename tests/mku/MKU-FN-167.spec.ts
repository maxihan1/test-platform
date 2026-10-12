import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자, 맞는이름들, 검색어고르기 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-167',
  name: '맞는 상품이 6개 넘는 검색어를 적으면 자동완성 목록에 5개가 보인다',
  techniques: ['경계값 분석'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

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

  const 상품들 = (await 상품목록(page.request)).items;

  await test.step('맞는 상품이 6개 넘는 검색어를 적는다', async () => {
    await 목록.검색칸.fill(검색어고르기(상품들, { 이상: 6 }));
    await 목록.자동완성항목.first().waitFor();
    await verify('맞는 상품이 6개 넘는 검색어를 적으면 자동완성 목록에 5개가 보인다', await 목록.자동완성항목.count(), 5);
  });

  await test.step('맞는 상품이 5개 이하인 검색어를 적는다', async () => {
    const 검색어 = 검색어고르기(상품들, { 이하: 5 });
    const 기대 = 맞는이름들(상품들, 검색어);
    await 목록.검색칸.fill(검색어);
    await 목록.자동완성.getByRole('option', { name: 기대[0] ?? '' }).waitFor();
    await verify('맞는 상품이 5개 이하인 검색어를 적으면 맞는 상품이 모두 자동완성에 보인다', (await 목록.자동완성항목.allInnerTexts()).sort(), [...기대].sort());
  });
});
