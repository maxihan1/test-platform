import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 맨위줄 } from './components/top-bar.component.js';
import { 장바구니열기 } from './helpers/cart.helper.js';
import { 스마트워치 } from './helpers/cart-orders-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문하기화면 } from './pages/checkout.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 될때까지기다려보기 } from './helpers/wait.helper.js';

export const spec = defineCase({
  tcId: 'DMA-UI-135',
  name: '장바구니 버튼 반응',
  platforms: ['android'],
  precondition: ['장바구니에 상품 줄이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 장바구니 = new 장바구니화면(driver);

  await test.step('일반 회원 계정으로 로그인해 장바구니를 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await 장바구니열기(driver);
    await verify('장바구니에 상품 줄이 있다', (await 장바구니.줄수()) > 0, true, { blocker: true });
  });

  await test.step('장바구니에서 줄 체크박스를 누른다', async () => {
    const 줄 = await 장바구니.줄꼭찾기(스마트워치);
    await 장바구니.줄체크누르기(줄);
    await 될때까지기다려보기(driver, async () => !(await 장바구니.줄체크했나(await 장바구니.줄꼭찾기(스마트워치))));
    await verify(
      '장바구니에서 줄 체크박스를 누르면 그 줄의 체크가 풀린다',
      await 장바구니.줄체크했나(await 장바구니.줄꼭찾기(스마트워치)),
      false,
    );
  });

  await test.step('장바구니에서 「선택 삭제」를 누른다', async () => {
    await 장바구니.선택삭제누르기();
    await 장바구니.확인창뜰때까지().catch(() => undefined);
    const 글 = (await 장바구니.확인창보이나()) ? await 장바구니.확인창글읽기() : '';
    await verify(
      '장바구니에서 「선택 삭제」를 누르면 확인 창 「선택한 상품 {N}개를 삭제하시겠습니까?」가 뜬다',
      /^선택한 상품 \d+개를 삭제하시겠습니까\?$/.test(글),
      true,
    );
    if (await 장바구니.확인창보이나()) await 장바구니.확인창닫기();
  });

  await test.step('장바구니에서 「주문하기」를 누른다', async () => {
    await 장바구니.주문하기누르기();
    const 주문하기 = new 주문하기화면(driver);
    await 주문하기.열릴때까지().catch(() => undefined);
    await verify('장바구니에서 「주문하기」를 누르면 주문하기 화면으로 간다', await 주문하기.보이나(), true);
    await driver.back();
    await 장바구니.열릴때까지();
  });

  await test.step('장바구니에서 「←」를 누른다', async () => {
    await new 맨위줄(driver).뒤로();
    await 목록.열릴때까지().catch(() => undefined);
    await verify('장바구니에서 「←」를 누르면 상품 목록으로 돌아간다', await 목록.보이나(), true);
  });
});
