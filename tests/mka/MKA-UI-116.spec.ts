import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리줄 } from './components/top-bar.component.js';
import { 상품읽기 } from './helpers/api.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'MKA-UI-116',
  name: '상품 상세 버튼 반응',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    옵션상품번호: z.number().describe('색상 · 사이즈 옵션이 있는 상품 번호 — 품절이 아니고 재고가 2개 이상인 상품').default(1),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);

  await test.step('로그인 화면에서 일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, params.loginId ?? '', params.loginPassword ?? ''), true, { blocker: true });
  });

  await test.step('상품 목록에서 옵션 상품 상세를 연다', async () => {
    const 상품 = await 상품읽기(request, params.옵션상품번호);
    await 목록.상품열기(상품.name);
    await verify('상품 상세가 보인다', await 상세.열릴때까지(), true, { blocker: true });
  });

  await test.step('옵션 상품 상세에서 「색상」 칩을 누른다', async () => {
    await 상세.색상찾아고르기();
    await verify('상품 상세에서 「색상」 칩을 누르면 그 칩이 골라진다', await 상세.색상칩골라질때까지(), true);
  });

  await test.step('옵션 상품 상세에서 「사이즈」 칩을 누른다', async () => {
    await 상세.사이즈찾아고르기();
    await verify('상품 상세에서 「사이즈」 칩을 누르면 그 칩이 골라진다', await 상세.사이즈칩골라질때까지(), true);
  });

  await test.step('상품 상세에서 「+」를 누른다', async () => {
    await 상세.수량찾기();
    const 앞수량 = Number(await 상세.수량글());
    await 상세.더하기누르기();
    await 상세.수량바뀔때까지(String(앞수량 + 1));
    await verify('상품 상세에서 「+」를 누르면 수량 숫자가 늘어난다', Number(await 상세.수량글()) > 앞수량, true);
  });

  await test.step('상품 상세를 연다', async () => {
    const 상품 = await 상품읽기(request, params.옵션상품번호);
    await new 머리줄(driver).뒤로누르기();
    await 목록.열릴때까지();
    await 목록.상품열기(상품.name);
    await 상세.열릴때까지();
    await 상세.담기찾기();
    await verify('상품 상세의 「장바구니 담기」 버튼은 누를 수 있게 보인다', (await 상세.담기보이나()) && (await 상세.담기눌리나()), true);
    await 상세.바로구매찾기();
    await verify('상품 상세의 「바로 구매」 버튼은 누를 수 있게 보인다', (await 상세.바로구매보이나()) && (await 상세.바로구매눌리나()), true);
  });
});
