import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 신고닫기 } from './helpers/account.helper.js';
import { 계정번호, 신고만들기 } from './helpers/api.helper.js';
import { 로그인하기, 새창으로로그인 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 신고상세화면 } from './pages/report-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-156',
  name: '신고 상세에서 「해결로 표시」를 누르면 그 신고가 해결되고 qa_user2 처벌 수가 그대로다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 qa_user2 신고가 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    userId: z.string().describe('신고자 아이디').optional().meta({ secret: true, account: '사용자' }),
    userPassword: z.string().describe('신고자 비밀번호').optional().meta({ secret: true, account: '사용자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 신고 = new 신고상세화면(page);
  const 상세 = new 계정상세화면(page);
  let 신고번호 = '';
  let 처벌전 = 0;

  try {
    await test.step('신고자 qa_user1 로 qa_user2 신고를 만든다', async () => {
      const 신고자 = await 새창으로로그인(page, params.userId, params.userPassword);
      try {
        신고번호 = await 신고만들기(신고자, 'qa_user2', { 게시물: '아무거나' });
      } finally {
        await 신고자.context().close();
      }
    });

    await test.step('Owner 계정으로 로그인해 그 신고 상세를 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 상세.열기(await 계정번호(page, 'qa_user2'));
      처벌전 = await 상세.처벌수();
      await 신고.열기(신고번호);
      await verify('케이스가 만든 qa_user2 신고가 있다', await 신고.해결로표시.isVisible(), true, { blocker: true });
    });

    await test.step('신고 상세에서 「해결로 표시」를 누른다', async () => {
      await 신고.해결로표시.click();
      await 신고.알림.모두.first().waitFor();
      await 신고.열기(신고번호);
      const 해결 = await verify('그 신고 상세에 「미해결로 표시」가 보인다', await 신고.미해결로표시.isVisible(), true);
      await 상세.열기(await 계정번호(page, 'qa_user2'));
      const 처벌 = await verify('qa_user2 처벌 수가 그대로다', await 상세.처벌수(), 처벌전);
      await verify('신고 상세에서 「해결로 표시」를 누르면 그 신고가 해결되고 qa_user2 처벌 수가 그대로다', 해결 && 처벌, true);
    });
  } finally {
    if (신고번호) await 신고닫기(page, 신고번호);
  }
});
