import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 장바구니열기 } from './helpers/cart.helper.js';
import { 스마트워치 } from './helpers/cart-orders-flow.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-203',
  name: '체크한 줄이 0건이면 「선택 삭제」를 누를 때 토스트 「삭제할 상품을 선택하세요」가 보인다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  precondition: ['장바구니의 모든 줄 체크가 풀려 있다', '장바구니의 한 줄만 체크되어 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 장바구니 = new 장바구니화면(driver);
  const 알림 = new 토스트(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('장바구니의 모든 줄 체크를 푼다', async () => {
    await 장바구니열기(driver);
    await verify('장바구니에 상품 줄이 있다', (await 장바구니.줄수()) > 0, true, { blocker: true });
    await 장바구니.모두끄기();
    await verify('장바구니의 모든 줄 체크가 풀려 있다', await 장바구니.체크한줄수(), 0, { blocker: true });
  });

  await test.step('체크한 줄이 0건일 때 「선택 삭제」를 누른다', async () => {
    await 장바구니.선택삭제누르기();
    await 알림.뜰때까지(8000).catch(() => undefined);
    const 글 = (await 알림.보이나()) ? await 알림.글() : '';
    await verify('체크한 줄이 0건이면 「선택 삭제」를 누를 때 토스트 「삭제할 상품을 선택하세요」가 보인다', 글, '삭제할 상품을 선택하세요');
    await 알림.사라질때까지().catch(() => undefined);
  }, { capture: true });

  await test.step('장바구니의 한 줄만 체크한다', async () => {
    await 장바구니.한줄만체크(스마트워치);
    await verify('장바구니의 한 줄만 체크되어 있다', await 장바구니.체크한줄수(), 1, { blocker: true });
  });

  await test.step('체크한 줄이 1건일 때 「선택 삭제」를 누른다', async () => {
    await 장바구니.선택삭제누르기();
    await 장바구니.확인창뜰때까지().catch(() => undefined);
    const 확인창글 = (await 장바구니.확인창보이나()) ? await 장바구니.확인창글읽기() : '';
    const 확인창 = await verify('확인 창 「선택한 상품 1개를 삭제하시겠습니까?」가 뜬다', 확인창글, '선택한 상품 1개를 삭제하시겠습니까?');
    const 토스트없음 = await verify('토스트가 보이지 않는다', await 알림.보이나(), false);
    await verify('체크한 줄이 1건이면 토스트 없이 확인 창 「선택한 상품 1개를 삭제하시겠습니까?」가 뜬다', 토스트없음 && 확인창, true);
    if (await 장바구니.확인창보이나()) await 장바구니.확인창닫기();
  }, { capture: true });
});
