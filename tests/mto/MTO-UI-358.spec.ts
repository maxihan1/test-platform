import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 계정목록화면 } from './pages/account-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-358',
  name: '계정 목록에서 qa_user2 이름을 누르면 제목 「qa_user2」 계정 상세로 간다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 계정목록화면(page);
  const 상세 = new 계정상세화면(page);

  await test.step('Owner 계정으로 로그인하고 「계정」 화면을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('계정 목록에서 qa_user2 이름을 누른다', async () => {
    await 목록.아이디로찾기('qa_user2');
    await 목록.계정이름링크('qa_user2').click();
    await 상세.카운터.waitFor();
    await verify('계정 목록에서 qa_user2 이름을 누르면 제목 「qa_user2」 계정 상세로 간다', (await 상세.제목.innerText()).trim(), 'qa_user2');
  });
});
