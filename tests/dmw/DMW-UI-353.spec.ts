import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 화면제목 } from './components/page-heading.component.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문완료화면 } from './pages/checkout-done.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-353',
  name: '주문 완료 화면에서 「주문 내역 보기」를 누르면 주문 내역이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 완료 = new 주문완료화면(page);
  const 제목 = new 화면제목(page);
  await 안내창막기(page);
  await 계정으로로그인(page, params.loginId, params.loginPassword);

  await test.step('주문 완료 화면의 「주문 내역 보기」를 누른다', async () => {
    await 완료.열기();
    await verify('주문 완료 화면이 보인다', await 완료.제목.isVisible(), true, { blocker: true });
    await 완료.주문내역보기.click();
    await 제목.글('주문 내역').waitFor();
    await verify('주문 완료 화면에서 「주문 내역 보기」를 누르면 주문 내역이 보인다', await 제목.글('주문 내역').isVisible(), true);
  });

  await test.step('주문 완료 화면의 「쇼핑 계속하기」를 누른다', async () => {
    await 완료.열기();
    await verify('주문 완료 화면이 보인다', await 완료.제목.isVisible(), true, { blocker: true });
    await 완료.쇼핑계속하기.click();
    await 제목.글('쇼핑').waitFor();
    await verify('주문 완료 화면에서 「쇼핑 계속하기」를 누르면 상품 목록이 보인다', await 제목.글('쇼핑').isVisible(), true);
  });
});
