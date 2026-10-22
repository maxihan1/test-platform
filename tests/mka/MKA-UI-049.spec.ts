import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상품목록읽기, 상품읽기 } from './helpers/api.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-049',
  name: '품절 상품 상세에는 눌리지 않는 「품절」 버튼만 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    품절상품번호: z.number().describe('도서 분류의 품절 상품 번호').default(35),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);

  await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, { blocker: true });
  });

  await test.step('품절 상품 상세를 연다', async () => {
    const 상품 = await 상품읽기(request, params.품절상품번호);
    const 도서 = await 상품목록읽기(request, { category: '도서', size: 50 });
    await verify('고른 상품이 품절이다', 상품.soldOut, true);
    await 목록.칩누르기('도서');
    await 목록.총개수바뀔때까지(`총 ${도서.total}개`);
    await 목록.상품열기(상품.name);
    await verify('상품 상세가 보인다', await 상세.열릴때까지(), true, { blocker: true });
    const 품절 = await verify('「품절」 버튼이 보인다', await 상세.품절버튼글(), '품절');
    const 안눌림 = await verify('「품절」 버튼이 눌리지 않는다', await 상세.품절버튼눌리나(), false);
    const 담기없음 = await verify('「장바구니 담기」 버튼이 보이지 않는다', await 상세.담기보이나(), false);
    const 구매없음 = await verify('「바로 구매」 버튼이 보이지 않는다', await 상세.바로구매보이나(), false);
    await verify('품절 상품 상세에는 눌리지 않는 「품절」 버튼만 보인다', 품절 && 안눌림 && 담기없음 && 구매없음, true);
  });
});
