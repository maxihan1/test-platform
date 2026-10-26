import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 일회용회원만들기 } from './helpers/account.helper.js';
import { 상품하나주문 } from './helpers/data.helper.js';
import { 끝쪽옵션없는상품, 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-286',
  name: '다른 회원의 주문 번호로 주문 상세를 열면 「권한이 없습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 상세 = new 주문상세화면(page);
  let 남의주문 = '';

  await test.step('다른 일회용 회원이 주문을 하나 만든다', async () => {
    const 남 = await 일회용회원만들기(request);
    await API로그인(request, 남.loginId, 남.password);
    const 상품 = await 끝쪽옵션없는상품(request);
    남의주문 = (await 상품하나주문(request, 상품.id)).id;
  });

  await test.step('회원으로 로그인한다', async () => {
    await 안내창막기(page);
    await 계정으로로그인(page, params.loginId, params.loginPassword);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('회원으로 로그인해 있다', (await 로그인한아이디(page.request)) !== null, true, { blocker: true });
  });

  await test.step('다른 회원의 주문 번호로 주문 상세를 연다', async () => {
    await 상세.열기(남의주문);
    await verify('다른 회원의 주문 번호로 주문 상세를 열면 「권한이 없습니다」가 보인다', (await 상세.안내제목.allInnerTexts()).join(', '), '권한이 없습니다');
  });
});
