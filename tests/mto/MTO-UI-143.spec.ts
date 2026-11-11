import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 만든신고, 신고들만들기, 신고정리 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 신고조치확인화면 } from './pages/report-confirm.page.js';
import { 신고상세화면 } from './pages/report-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-143',
  name: '로컬 대상 확인 화면에 경고 미리보기와 「중재 결정에 대한 추가적인 이유.」 입력칸이 보인다',
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

    await test.step('신고 상세에서 「제한」을 누른다', async () => {
      await 신고.제한.click();
      await 확인.제목.waitFor();
      const 미리보기 = await verify('경고 미리보기가 보인다', await 확인.경고미리보기.isVisible(), true);
      const 이유 = await verify('「중재 결정에 대한 추가적인 이유.」 입력칸이 보인다', await 확인.추가이유칸.isVisible(), true);
      await verify('로컬 대상 확인 화면에 경고 미리보기와 「중재 결정에 대한 추가적인 이유.」 입력칸이 보인다', 미리보기 && 이유, true);
    });
  } finally {
    await 신고정리(page, 신고들.map((항목) => 항목.번호), params.loginId, params.loginPassword, false);
  }
});
