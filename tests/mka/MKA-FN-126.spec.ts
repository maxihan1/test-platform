import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리줄 } from './components/top-bar.component.js';
import { 상품목록읽기, 상품읽기 } from './helpers/api.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-126',
  name: '수량이 1이면 「−」 버튼이 눌리지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다', '재고가 10개보다 많은 상품이다', '재고가 1개인 상품이다'],
  techniques: ['결정 테이블'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    재고많은상품번호: z.number().describe('재고가 10개보다 많은 상품 번호').default(34),
    재고1개상품번호: z.number().describe('재고가 1개인 상품 번호').default(12),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);

  await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, { blocker: true });
  });

  await test.step('상품 상세를 연다', async () => {
    const 상품 = await 상품읽기(request, params.재고많은상품번호);
    await verify('고른 상품의 재고가 10개보다 많다', 상품.stock > 10, true);
    await 목록.상품열기(상품.name);
    await verify('상품 상세가 보인다', await 상세.열릴때까지(), true, { blocker: true });
    await 상세.수량찾기();
    await verify('수량이 1이면 「−」 버튼이 눌리지 않는다', await 상세.빼기눌리나(), false);
  });

  await test.step('「+」를 눌러 수량을 10으로 올린다', async () => {
    for (let 수량 = 2; 수량 <= 10; 수량 += 1) {
      await 상세.더하기누르기();
      await 상세.수량바뀔때까지(String(수량));
    }
    const 열 = await verify('수량이 10이다', await 상세.수량글(), '10');
    const 안눌림 = await verify('「+」 버튼이 눌리지 않는다', await 상세.더하기눌리나(), false);
    await verify('재고가 10개보다 많은 상품은 수량이 10이면 「+」 버튼이 눌리지 않는다', 열 && 안눌림, true);
  });

  await test.step('재고가 1개인 상품 상세를 연다', async () => {
    const 상품 = await 상품읽기(request, params.재고1개상품번호);
    const 같은분류 = await 상품목록읽기(request, { category: 상품.category, size: 50 });
    await verify('고른 상품의 재고가 1개다', 상품.stock, 1);
    await new 머리줄(driver).뒤로누르기();
    await 목록.열릴때까지();
    await 목록.칩누르기(상품.category);
    await 목록.총개수바뀔때까지(`총 ${같은분류.total}개`);
    await 목록.상품열기(상품.name);
    await verify('상품 상세가 보인다', await 상세.열릴때까지(), true, { blocker: true });
    await 상세.수량찾기();
    await verify('재고가 1개인 상품은 수량 1에서 「+」 버튼이 눌리지 않는다', await 상세.더하기눌리나(), false);
  });
});
