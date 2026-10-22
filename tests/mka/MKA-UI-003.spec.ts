import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리줄 } from './components/top-bar.component.js';
import { 다른화면제목글 } from './helpers/screen-tools.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 상품상세화면 } from './pages/product-detail.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-003',
  name: '여는 화면마다 맨 위 줄에 그 화면 이름이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 머리 = new 머리줄(driver);
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);

  await test.step('일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, {
      blocker: true,
    });
  });

  await test.step('상품 목록 · 상품 상세 · 장바구니 · 주문 내역을 차례로 연다', async () => {
    const 목록제목 = await verify('상품 목록 화면 이름이 「상품」이다', await 머리.제목글(), '상품');

    await 목록.첫카드누르기();
    await 상세.열릴때까지();
    const 상세제목 = await verify('상품 상세 화면 이름이 「상품 상세」다', await 다른화면제목글(driver), '상품 상세');

    await 머리.뒤로누르기();
    await 목록.열릴때까지();
    await 목록.장바구니버튼.click();
    const 장바구니제목 = await verify('장바구니 화면 이름이 「장바구니」다', await 다른화면제목글(driver), '장바구니');

    await 머리.뒤로누르기();
    await 목록.열릴때까지();
    await 목록.주문내역버튼.click();
    const 주문내역제목 = await verify('주문 내역 화면 이름이 「주문 내역」이다', await 다른화면제목글(driver), '주문 내역');

    await verify('여는 화면마다 맨 위 줄에 그 화면 이름이 보인다', 목록제목 && 상세제목 && 장바구니제목 && 주문내역제목, true);
  });
});
