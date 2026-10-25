import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-532',
  name: '없는 주문 번호로 주문 상세를 열면 화면이 깨지지 않고 안내가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['오류 추정'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
    주문번호: z.string().describe('없는 주문 번호 — 어느 주문에도 없는 번호').default('DM19990101-0000'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 주문상세화면(page);

  await test.step('회원으로 로그인한다', async () => {
    await 안내창막기(page);
    await 계정으로로그인(page, params.loginId, params.loginPassword);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('회원으로 로그인해 있다', (await 로그인한아이디(page.request)) !== null, true, { blocker: true });
  });

  await test.step('없는 주문 번호로 주문 상세를 연다', async () => {
    await 상세.열기(params.주문번호);
    const 안내 = await verify('안내 문구가 보인다', await 상세.안내제목.isVisible(), true);
    const 돌아가기 = await verify('「주문 내역으로」 링크가 보인다', await 상세.주문내역으로.isVisible(), true);
    await verify('없는 주문 번호로 주문 상세를 열면 화면이 깨지지 않고 안내가 보인다', 안내 && 돌아가기, true);
  });
});
