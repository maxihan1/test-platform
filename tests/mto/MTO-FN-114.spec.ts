import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 만든신고, 신고들만들기, 신고정리 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 조치화면 } from './pages/account-action.page.js';
import { 신고상세화면 } from './pages/report-detail.page.js';
import { 신고목록화면 } from './pages/report-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-114',
  name: '열린 신고가 2건인 계정에 「민감함」 조치를 취하면 두 신고가 모두 「해결」 목록으로 옮겨진다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 qa_user2 신고가 2건 있다'],
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
  const 목록 = new 신고목록화면(page);
  const 조치 = new 조치화면(page);
  let 신고들: 만든신고[] = [];

  try {
    await test.step('신고자 qa_user1 로 qa_user2 신고를 2건 만든다', async () => {
      신고들 = await 신고들만들기(page, params.userId, params.userPassword, 2, { 게시물: '없음' });
    });

    await test.step('Owner 계정으로 로그인해 두 신고가 모두 열려 있는지 확인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 신고.열기(신고들[0]?.번호 ?? '');
      const 첫째 = await verify('첫 신고가 열려 있다', await 신고.해결로표시.isVisible(), true, { blocker: true });
      await 신고.열기(신고들[1]?.번호 ?? '');
      const 둘째 = await verify('둘째 신고가 열려 있다', await 신고.해결로표시.isVisible(), true, { blocker: true });
      await verify('케이스가 만든 qa_user2 신고가 2건 있다', 첫째 && 둘째, true, { blocker: true });
    });

    await test.step('신고 하나에서 「사용자 지정」으로 「민감함」 조치를 취한다', async () => {
      await 신고.열기(신고들[0]?.번호 ?? '');
      await 신고.사용자지정.click();
      await 조치.그려질때까지();
      await 조치.조치하기('민감함', false);
      await 목록.열기('resolved=1');
      const 첫째 = await verify('첫 신고가 「해결」 목록에 보인다', await 목록.사유링크(신고들[0]?.사유 ?? '').isVisible(), true);
      const 둘째 = await verify('둘째 신고가 「해결」 목록에 보인다', await 목록.사유링크(신고들[1]?.사유 ?? '').isVisible(), true);
      await verify('열린 신고가 2건인 계정에 「민감함」 조치를 취하면 두 신고가 모두 「해결」 목록으로 옮겨진다', 첫째 && 둘째, true);
    });
  } finally {
    await 신고정리(page, 신고들.map((항목) => 항목.번호), params.loginId, params.loginPassword, true);
  }
});
