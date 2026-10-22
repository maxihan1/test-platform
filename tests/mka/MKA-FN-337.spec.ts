import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 서버로그인, 상품읽기 } from './helpers/api.helper.js';
import { 토스트사라질때까지 } from './helpers/screen-tools.helper.js';
import { 앱로그인 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';
import { 상품상세화면 } from './pages/product-detail.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-337',
  name: '토스트가 뜬 뒤 기준 시간이 지나면 토스트가 사라진다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  held: '판정 불가 — 토스트가 사라지는 시간이 기획서에 없다',
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    옵션상품번호: z.number().describe('열어 볼 상품 번호 — 옵션이 있고 품절이 아닌 상품').default(1),
    토스트초: z.number().describe('토스트가 사라지는 시간(초)'),
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

  await test.step('일반 회원으로 로그인한다', async () => {
    await verify('상품 목록이 보인다', await 앱로그인(driver, 아이디, 비밀번호), true, { blocker: true });
  });

  await test.step('옵션 상품 상세를 연다', async () => {
    await 목록.상품열기(상품.name);
    await verify('상품 상세가 보인다', await 상세.열릴때까지(), true, { blocker: true });
  });

  await test.step('옵션 상품 상세에서 옵션 없이 「장바구니 담기」를 눌러 토스트를 띄운다', async () => {
    await 상세.담기누르기();
    await verify('토스트가 보인다', await 알림.뜰때까지(), true, { blocker: true });
  });

  await test.step('토스트가 뜬 뒤 기준 시간만큼 기다린다', async () => {
    await verify('토스트가 뜬 뒤 기준 시간이 지나면 토스트가 사라진다', await 토스트사라질때까지(알림, params.토스트초), true);
  });
});
