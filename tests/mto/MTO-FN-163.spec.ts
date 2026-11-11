import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/api.helper.js';
import { type 만든신고, 신고들만들기, 신고정리 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 신고조치확인화면 } from './pages/report-confirm.page.js';
import { 신고상세화면 } from './pages/report-detail.page.js';
import { 신고목록화면 } from './pages/report-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-163',
  name: '신고 상세에서 「정지」를 확정하면 qa_user2 가 정지되고 그 신고가 해결된다',
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
  const 확인 = new 신고조치확인화면(page);
  const 목록 = new 신고목록화면(page);
  const 상세 = new 계정상세화면(page);
  let 신고들: 만든신고[] = [];
  let 번호 = '';

  try {
    await test.step('신고자 qa_user1 로 qa_user2 신고를 만든다', async () => {
      신고들 = await 신고들만들기(page, params.userId, params.userPassword, 1, { 게시물: '없음' });
      번호 = 신고들[0]?.번호 ?? '';
    });

    await test.step('Owner 계정으로 로그인해 그 신고 상세를 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 신고.열기(번호);
      await verify('케이스가 만든 qa_user2 신고가 있다', await 신고.해결로표시.isVisible(), true, { blocker: true });
    });

    await test.step('신고 상세에서 「정지」를 누르고 확인 화면에서 「확정」을 누른다', async () => {
      await 신고.정지.click();
      await 확인.제목.waitFor();
      await 확인.확정.click();
      await 목록.제목.waitFor();
      await 상세.열기(await 계정번호(page, 'qa_user2'));
      const 정지됨 = await verify('qa_user2 가 정지된다', await 상세.정지해제.isVisible(), true);
      await 신고.열기(번호);
      const 해결 = await verify('그 신고가 해결된다', await 신고.미해결로표시.isVisible(), true);
      await verify('신고 상세에서 「정지」를 확정하면 qa_user2 가 정지되고 그 신고가 해결된다', 정지됨 && 해결, true);
    });
  } finally {
    await 신고정리(page, 신고들.map((항목) => 항목.번호), params.loginId, params.loginPassword, true);
  }
});
