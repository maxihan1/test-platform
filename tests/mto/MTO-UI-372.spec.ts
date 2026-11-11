import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 신고상세화면 } from './pages/report-detail.page.js';
import { 신고목록화면 } from './pages/report-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-372',
  name: '신고 목록에서 신고 줄을 누르면 제목 「신고 #N」 화면으로 간다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '미해결 spam_shop 신고 3건이 있다'],
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
    await verify('미해결 spam_shop 신고 3건이 있다', await 목록.카드('spam_shop').isVisible(), true, { blocker: true });
  });

  await test.step('「신고」 화면에서 spam_shop 신고 줄 하나를 누른다', async () => {
    await 목록.신고링크('spam_shop').click();
    await 신고.제목.waitFor();
    await verify('신고 목록에서 신고 줄을 누르면 제목 「신고 #N」 화면으로 간다', /^신고 #\d+$/.test((await 신고.제목.innerText()).trim()), true);
  });
});
