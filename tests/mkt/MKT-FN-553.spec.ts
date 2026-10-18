import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 기본회원으로로그인, 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 주문상세화면 } from './pages/order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-553',
  name: '없는 주문 번호로 주문 상세를 열면 「주문을 찾을 수 없습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
    없는주문번호: z.string().min(1).describe('열어 볼 주문 번호 — 어느 회원에게도 없는 번호').default('DM00000000-0000'),
  }),
  expected: null,
  techniques: ['오류 추정'],
});

test(spec, async ({ page, params }) => {
  const 주문상세 = new 주문상세화면(page);

  await test.step('회원으로 로그인한다', async () => {
    await 방해창막기(page);
    await 기본회원으로로그인(page.request, params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('로그인한 상태를 확인한다', async () => {
    await verify('세션에 회원이 있다', await 세션회원있는가(page.request), true, { blocker: true });
  });

  await test.step('없는 주문 번호로 주문 상세를 연다', async () => {
    await 주문상세.열기(params.없는주문번호);
    await verify('없는 주문 번호로 주문 상세를 열면 「주문을 찾을 수 없습니다」가 보인다', await 주문상세.주문없음제목.isVisible(), true);
  });
});
