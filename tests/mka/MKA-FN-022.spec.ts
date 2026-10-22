import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 서버로그인, 상품읽기, 장바구니되돌리기, 장바구니바꾸기 } from './helpers/api.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 상품상세화면 } from './pages/product-detail.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-022',
  name: '토스트가 떠 있는 동안 새 토스트가 오면 화면에 새 토스트 하나만 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    옵션상품번호: z.number().describe('열어 볼 상품 번호 — 옵션이 있고 품절이 아닌 상품').default(1),
  }),
  expected: null,
});

test(spec, async ({ driver, request, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);
  const 알림 = new 토스트(driver);

  await 서버로그인(request, 아이디, 비밀번호);
  const 상품 = await 상품읽기(request, params.옵션상품번호);
  const 앞줄들 = await 장바구니바꾸기(request, []);

  try {
    await test.step('일반 회원으로 로그인한다', async () => {
      await verify('상품 목록이 보인다', await 앱로그인(driver, 아이디, 비밀번호), true, { blocker: true });
    });

    await test.step('옵션 상품 상세를 연다', async () => {
      await 목록.상품열기(상품.name);
      await verify('상품 상세가 보인다', await 상세.열릴때까지(), true, { blocker: true });
    });

    await test.step('옵션 상품 상세에서 옵션 없이 「장바구니 담기」를 누른 뒤 곧바로 옵션을 고르고 다시 누른다', async () => {
      await 상세.담기누르기();
      await verify('옵션 없이 누르면 토스트가 보인다', await 알림.뜰때까지(), true, { blocker: true });
      await 상세.옵션고르기();
      await 상세.담기누르기();
      const 새토스트 = await verify('새 토스트 「장바구니에 담았습니다」가 보인다', await 알림.글바뀔때까지('장바구니에 담았습니다'), true);
      const 하나 = await verify('화면에 토스트가 하나만 보인다', await 알림.개수(), 1);
      await verify('토스트가 떠 있는 동안 새 토스트가 오면 화면에 새 토스트 하나만 보인다', 새토스트 && 하나, true);
    });
  } finally {
    await 장바구니되돌리기(request, 앞줄들);
  }
});
