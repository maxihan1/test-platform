import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인폼 } from './components/login-form.component.js';
import { 주문내역화면 } from './pages/my-orders.page.js';
import { 주문상세화면 } from './pages/my-order-detail.page.js';

function 날짜글자(날: Date): string {
  const 두자리 = (수: number) => String(수).padStart(2, '0');
  return `${날.getFullYear()}-${두자리(날.getMonth() + 1)}-${두자리(날.getDate())}`;
}

export const spec = defineCase({
  tcId: 'MKT-FN-048',
  name: '기간 버튼을 누르면 그 기간의 주문만 최신순으로 보이고 주문을 누르면 상세로 간다',
  precondition: ['주문이 있는 회원 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    ok: z.boolean().describe('기간 안의 주문만 최신순으로 보이는지').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 내역 = new 주문내역화면(page);
  const 상세 = new 주문상세화면(page);

  await test.step('회원 계정으로 로그인한다', async () => {
    await new 로그인폼(page).로그인한다(params.loginId, params.password ?? '');
  });

  await test.step('기간 버튼 「3개월」과 「전체」를 차례로 누른다', async () => {
    await 내역.열기();
    await 내역.기간을누른다('3개월');
    const 석달 = await 내역.줄정보();
    await 내역.기간을누른다('전체');
    const 전체 = await 내역.줄정보();
    const 기준 = new Date();
    기준.setMonth(기준.getMonth() - 3);
    const 기준일 = 날짜글자(기준);
    const 최신순 = (줄들: { 날짜: string }[]) => 줄들.every((줄, 번) => 번 === 0 || 줄들[번 - 1].날짜 >= 줄.날짜);
    await verify('기간 버튼을 누르면 그 기간의 주문만 최신순으로 보인다', 석달.length > 0 && 석달.every((줄) => 줄.날짜 >= 기준일) && 최신순(석달) && 최신순(전체), expected.ok);
  });

  await test.step('주문 내역에서 주문 하나를 누른다', async () => {
    const 번호 = (await 내역.첫줄링크.innerText()).trim();
    await 내역.첫줄링크.click();
    await 상세.제목.waitFor();
    await verify('주문을 누르면 그 주문의 상세로 간다', decodeURIComponent(new URL(page.url()).pathname), `/my/orders/${번호}`);
  });
});
