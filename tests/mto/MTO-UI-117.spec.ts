import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 신고목록화면 } from './pages/report-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-117',
  name: '신고 목록에 spam_shop 신고 3건이 한 카드에 묶이고 카드 왼쪽에 「N 개의 참고사항」과 「제한 없음」이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '미해결 spam_shop 신고 3건이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 신고목록화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
    await verify('미해결 spam_shop 신고 3건이 있다', await 목록.카드('spam_shop').isVisible(), true, { blocker: true });
  });

  await test.step('「신고」 화면을 연다', async () => {
    await 목록.열기();
    const 카드 = await verify('spam_shop 카드가 하나다', await 목록.카드('spam_shop').count(), 1);
    const 줄수 = await verify('카드 하나에 신고 3건이 묶인다', await 목록.신고줄들('spam_shop').count(), 3);
    const 참고 = await verify('「N 개의 참고사항」이 보인다', await 목록.참고사항링크('spam_shop').isVisible(), true);
    const 제한 = await verify('「제한 없음」이 보인다', await 목록.제한없음('spam_shop').isVisible(), true);
    await verify('신고 목록에 spam_shop 신고 3건이 한 카드에 묶이고 카드 왼쪽에 「N 개의 참고사항」과 「제한 없음」이 보인다', 카드 && 줄수 && 참고 && 제한, true);
  });
});
