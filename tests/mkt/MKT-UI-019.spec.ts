import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-019',
  name: '주문 내역 화면에 기간 버튼이 보이고 주문 상태 글자가 상태마다 다른 색으로 보인다',
  precondition: ['주문이 있는 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('로그인 아이디').default('user1'),
    password: z.string().min(1).describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 머리 = new 머리글(page);
  const 화면 = new 주문내역화면(page);
  await page.request.post('/api/auth/login', { data: { loginId: params.loginId, password: params.password ?? '' } });

  await test.step('마이페이지의 주문 내역 화면을 연다', async () => {
    await 화면.열기();
    await 머리.로그아웃버튼().waitFor();
    await 화면.주문표().waitFor();
    await verify('주문이 있는 회원으로 로그인해 있다', (await 화면.주문행들().count()) > 0, true, { blocker: true });
    await verify(
      '기간 버튼 「1개월」 「3개월」 「전체」가 보인다',
      [await 화면.기간버튼('1개월').isVisible(), await 화면.기간버튼('3개월').isVisible(), await 화면.기간버튼('전체').isVisible()],
      [true, true, true],
    );
    await verify('기간 버튼은 「3개월」이 기본으로 선택돼 있다', await 화면.선택된기간버튼('3개월').isVisible(), true);
  });

  await test.step('기간을 「전체」로 바꿔 주문 내역을 연다', async () => {
    await 화면.기간버튼('전체').click();
    await 화면.주문표().waitFor();
    const 상태들 = await 화면.상태별색();
    const 허용 = ['결제완료', '배송중', '배송완료', '주문취소'];
    const 색 = new Map(상태들.map((상태) => [상태.글자, `${상태.글자색} ${상태.배경색}`]));
    await verify(
      '주문 상태 글자는 「결제완료」 「배송중」 「배송완료」 「주문취소」 가운데 하나이고 상태마다 색이 다르다',
      [상태들.every((상태) => 허용.includes(상태.글자)), new Set(색.values()).size === 색.size],
      [true, true],
    );
  });
});
