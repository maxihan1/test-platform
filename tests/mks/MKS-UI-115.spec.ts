import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKS-UI-115',
  name: '상품 상세에 색상 · 사이즈 선택 상자가 「선택하세요」로 보인다',
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
    await verify('로그인한 회원이 없다', (await 로그인한아이디(page.request)) === null, true, { blocker: true });
  });

  await test.step('상품 상세를 연다', async () => {
    await 상세.열기(1);
    await 상세.화면기다리기();
    await verify(
      '상품 상세에 색상 · 사이즈 선택 상자가 「선택하세요」로 보인다',
      [await 상세.선택상자의선택글(상세.색상), await 상세.선택상자의선택글(상세.사이즈)],
      ['선택하세요', '선택하세요'],
    );
  });
});
