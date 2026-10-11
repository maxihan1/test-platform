import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 둘째아이디, 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 결제완료주문번호 } from './helpers/member.helper.js';
import { 주문상세화면 } from './pages/my-order.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-112',
  name: '남의 주문 번호로 주문 상세를 열면 「권한이 없습니다」 가 보인다',
  platforms: ['desktop'],
  precondition: [
    '두 번째 회원으로 로그인해 있다',
  ],
  techniques: ['동등 분할'],
  params: z.object({
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 주문상세화면(page);
  const 머리 = new 머리글(page);

  await 방해막기(page);

  await test.step('두 번째 회원으로 로그인한다', async () => {
    await 화면로그인(page, 둘째아이디, params.password ?? '');
    await 머리.로그아웃버튼.waitFor();
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('첫 번째 회원의 주문 번호로 주문 상세 화면을 연다', async () => {
    await 상세.열기(결제완료주문번호);
    await verify('남의 주문 번호로 주문 상세를 열면 「권한이 없습니다」 가 보인다', await 상세.권한없음안내.isVisible(), true);
  });
});
