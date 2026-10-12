import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKS-UI-114',
  name: '쇼핑 목록에 카테고리 체크박스 · 「최대 가격」 막대 · 「품절 상품 제외」 체크박스 · 정렬 선택 상자가 보인다',
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
    await verify('로그인한 회원이 없다', (await 로그인한아이디(page.request)) === null, true, { blocker: true });
  });

  await test.step('쇼핑 목록을 연다', async () => {
    await 목록.열기();
    await 목록.첫화면기다리기();
    await verify(
      '쇼핑 목록에 카테고리 체크박스 · 「최대 가격」 막대 · 「품절 상품 제외」 체크박스 · 정렬 선택 상자가 보인다',
      [await 목록.카테고리들이모두보이는가(), await 목록.가격슬라이더.isVisible(), await 목록.품절제외.isVisible(), await 목록.정렬.isVisible()],
      [true, true, true, true],
    );
  });
});
