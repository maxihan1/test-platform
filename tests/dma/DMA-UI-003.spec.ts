import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 맨위줄 } from './components/top-bar.component.js';
import { 장바구니열기, 목록으로돌아가기 } from './helpers/cart.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 주문내역열기 } from './helpers/order.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 상품상세화면 } from './pages/product-detail.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-003',
  name: '첫 화면이 아닌 화면은 맨 위 줄 왼쪽에 「←」 버튼이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 맨위 = new 맨위줄(driver);

  const 왼쪽에보이나 = async (): Promise<[boolean, boolean]> => {
    const 보임 = await 맨위.뒤로버튼보이나();
    return [보임, 보임 ? await 맨위.뒤로버튼이왼쪽인가() : false];
  };

  await test.step('일반 회원 계정으로 로그인한다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('상품 상세 · 장바구니 · 주문 내역 화면을 차례로 연다', async () => {
    await 목록.첫상품열기();
    const 상세 = new 상품상세화면(driver);
    await 상세.열릴때까지();
    const [상세보임, 상세왼쪽] = await 왼쪽에보이나();
    const 상세표시 = await verify('상품 상세의 맨 위 줄에 「←」 버튼이 보인다', 상세보임, true);
    const 상세자리 = await verify('상품 상세의 「←」 버튼이 제목 왼쪽에 있다', 상세왼쪽, true);

    await 목록으로돌아가기(driver);
    await 장바구니열기(driver);
    const [장바구니보임, 장바구니왼쪽] = await 왼쪽에보이나();
    const 장바구니표시 = await verify('장바구니의 맨 위 줄에 「←」 버튼이 보인다', 장바구니보임, true);
    const 장바구니자리 = await verify('장바구니의 「←」 버튼이 제목 왼쪽에 있다', 장바구니왼쪽, true);

    await 주문내역열기(driver);
    const [내역보임, 내역왼쪽] = await 왼쪽에보이나();
    const 내역표시 = await verify('주문 내역의 맨 위 줄에 「←」 버튼이 보인다', 내역보임, true);
    const 내역자리 = await verify('주문 내역의 「←」 버튼이 제목 왼쪽에 있다', 내역왼쪽, true);

    await verify(
      '첫 화면이 아닌 화면은 맨 위 줄 왼쪽에 「←」 버튼이 보인다',
      상세표시 && 상세자리 && 장바구니표시 && 장바구니자리 && 내역표시 && 내역자리,
      true,
    );
  }, { capture: true });
});
