import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 신고상세화면 } from './pages/report-detail.page.js';
import { 신고목록화면 } from './pages/report-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-374',
  name: '미해결 신고 상세에는 「해결로 표시」, 해결된 신고 상세에는 「미해결로 표시」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '미해결 spam_shop 신고와 해결된 scam_park 신고가 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 신고목록화면(page);
  const 신고 = new 신고상세화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
    const 미해결 = await verify('미해결 spam_shop 신고가 있다', await 목록.카드('spam_shop').isVisible(), true, { blocker: true });
    const 해결 = await verify('해결된 scam_park 신고가 있다', await 목록.해결카드찾기('scam_park'), true, { blocker: true });
    await verify('미해결 spam_shop 신고와 해결된 scam_park 신고가 있다', 미해결 && 해결, true, { blocker: true });
  });

  await test.step('미해결 신고 상세와 해결된 신고 상세를 차례로 연다', async () => {
    await 목록.열기();
    await 목록.신고링크('spam_shop').click();
    await 신고.제목.waitFor();
    const 미해결표시 = await verify('미해결 신고 상세에는 「해결로 표시」가 보인다', await 신고.해결로표시.isVisible(), true);
    await 목록.해결카드찾기('scam_park');
    await 목록.신고링크('scam_park').click();
    await 신고.제목.waitFor();
    const 해결표시 = await verify('해결된 신고 상세에는 「미해결로 표시」가 보인다', await 신고.미해결로표시.isVisible(), true);
    await verify('미해결 신고 상세에는 「해결로 표시」, 해결된 신고 상세에는 「미해결로 표시」가 보인다', 미해결표시 && 해결표시, true);
  });
});
