import { 금액부분 } from './helpers/checkout-flow.helper.js';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 원 } from './helpers/app.helper.js';
import { 상품읽기, 서버로그인, 새주문모두취소, 주문목록읽기, 주문읽기 } from './helpers/api.helper.js';
import { 새주문번호, 주문결제금액글 } from './helpers/screen-tools.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';
import { 주문상세화면 } from './pages/order-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 상품상세화면 } from './pages/product-detail.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-046',
  name: '결제하면 주문 상세의 「결제 금액」이 서버가 확정한 주문 금액과 같다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품번호: z.number().describe('바로 구매할 상품 번호 — 품절이 아닌 상품').default(34),
    받는분: z.string().describe('받는 분 이름 — 비어 있지 않은 글자').default('김데모'),
    연락처: z.string().describe('연락처 — 숫자 10~11자').default('01012345678'),
    상세주소: z.string().describe('상세 주소 — 비어 있지 않은 글자').default('4층'),
    주소검색어: z.string().describe('주소 검색어 — 결과가 있는 2자 이상 글자').default('테헤란'),
    결제수단: z.enum(['신용카드', '계좌이체', '무통장입금']).describe('결제 수단').default('계좌이체'),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);
  const 주문하기 = new 주문하기화면(driver);
  const 주문상세 = new 주문상세화면(driver);

  await 서버로그인(request, 아이디, 비밀번호);
  const 상품 = await 상품읽기(request, params.상품번호);
  const 앞번호들 = (await 주문목록읽기(request)).map((주문) => 주문.id);

  try {
    await test.step('일반 회원으로 로그인한다', async () => {
      await verify('상품 목록이 보인다', await 앱로그인(driver, 아이디, 비밀번호), true, { blocker: true });
    });

    await test.step('상품 상세를 연다', async () => {
      await 목록.상품열기(상품.name);
      await verify('상품 상세가 보인다', await 상세.열릴때까지(), true, { blocker: true });
    });

    await test.step('「바로 구매」로 배송 정보를 채우고 결제한다', async () => {
      await 상세.바로구매누르기();
      await verify('주문하기 화면이 보인다', await 주문하기.열릴때까지(), true, { blocker: true });
      await 주문하기.다채우기(
        { 받는분: params.받는분, 연락처: params.연락처, 상세주소: params.상세주소 },
        params.주소검색어,
        params.결제수단,
      );
      await 주문하기.동의누르기();
      await 주문하기.결제누르기();
      await verify('주문 상세가 보인다', await 주문상세.열릴때까지(), true, { blocker: true });
      const 주문 = await 주문읽기(request, await 새주문번호(request, 앞번호들));
      await verify(
        '결제하면 주문 상세의 「결제 금액」이 서버가 확정한 주문 금액과 같다',
        금액부분(await 주문결제금액글(driver, 주문상세)),
        원(주문.total),
      );
    });
  } finally {
    await 새주문모두취소(request, 앞번호들);
  }
});
