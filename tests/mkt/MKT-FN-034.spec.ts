import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

const 날짜글자 = (날: Date): string =>
  `${날.getFullYear()}-${String(날.getMonth() + 1).padStart(2, '0')}-${String(날.getDate()).padStart(2, '0')}`;

export const spec = defineCase({
  tcId: 'MKT-FN-034',
  name: '기간 버튼 「전체」를 누르면 주문 내역이 최신순으로 보이고 「1개월」을 누르면 한 달 안의 주문만 보인다',
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

  await test.step('기간 버튼 「전체」를 누른다', async () => {
    await 화면.열기();
    await 머리.로그아웃버튼().waitFor();
    await 화면.주문표().waitFor();
    await verify('주문이 있는 회원으로 로그인해 있다', (await 화면.주문행들().count()) > 0, true, { blocker: true });
    await 화면.기간버튼('전체').click();
    await 화면.선택된기간버튼('전체').waitFor();
    await 화면.주문표().waitFor();
    const 줄들 = await 화면.줄별칸글자();
    const 날짜들 = 줄들.map((칸들) => 칸들[0] ?? '');
    await verify(
      '주문 내역이 최신순으로 보이고 줄마다 주문일 · 주문번호 · 대표 상품명 · 결제 금액 · 상태가 있다',
      [날짜들.every((날짜, 순서) => 순서 === 0 || (날짜들[순서 - 1] ?? '') >= 날짜), 줄들.every((칸들) => 칸들.length === 5 && 칸들.every((칸) => 칸 !== ''))],
      [true, true],
    );
  });

  await test.step('기간 버튼 「1개월」을 누른다', async () => {
    await 화면.기간버튼('1개월').click();
    await 화면.선택된기간버튼('1개월').waitFor();
    await 화면.주문표().waitFor();
    const 한달전 = new Date();
    한달전.setMonth(한달전.getMonth() - 1);
    const 기준 = 날짜글자(한달전);
    const 줄들 = await 화면.줄별칸글자();
    await verify(
      '「1개월」을 누르면 한 달 안에 주문한 건만 보인다',
      [줄들.length > 0, 줄들.filter((칸들) => (칸들[0] ?? '') < 기준).length],
      [true, 0],
    );
  });
});
