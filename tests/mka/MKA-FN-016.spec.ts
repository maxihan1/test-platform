import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 서버로그인, 상품읽기, 장바구니되돌리기, 장바구니바꾸기 } from './helpers/api.helper.js';
import { 화면아래에있나 } from './helpers/screen-tools.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 상품상세화면 } from './pages/product-detail.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-016',
  name: '「장바구니 담기」로 담으면 처리 결과가 화면 아래 토스트로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품번호: z.number().describe('열어 볼 상품 번호 — 옵션이 없고 품절이 아닌 상품').default(34),
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
  const 상품 = await 상품읽기(request, params.상품번호);
  const 앞줄들 = await 장바구니바꾸기(request, []);

  try {
    await test.step('일반 회원으로 로그인한다', async () => {
      await verify('상품 목록이 보인다', await 앱로그인(driver, 아이디, 비밀번호), true, { blocker: true });
    });

    await test.step('옵션 없는 상품 상세를 연다', async () => {
      await 목록.상품열기(상품.name);
      await verify('상품 상세가 보인다', await 상세.열릴때까지(), true, { blocker: true });
    });

    await test.step('옵션 없는 상품 상세에서 「장바구니 담기」를 누른다', async () => {
      await 상세.담기누르기();
      const 떴다 = await verify('토스트가 보인다', await 알림.뜰때까지(), true);
      const 글 = await verify('토스트에 「장바구니에 담았습니다」가 보인다', await 알림.글(), '장바구니에 담았습니다');
      const 아래 = await verify('토스트가 화면 아래에 있다', await 화면아래에있나(driver, 알림.틀), true);
      await verify('「장바구니 담기」로 담으면 처리 결과가 화면 아래 토스트로 보인다', 떴다 && 글 && 아래, true);
    });
  } finally {
    await 장바구니되돌리기(request, 앞줄들);
  }
});
