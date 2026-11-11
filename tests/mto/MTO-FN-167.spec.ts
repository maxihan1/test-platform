import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 만든신고, 신고들만들기, 신고정리 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 신고상세화면 } from './pages/report-detail.page.js';
import { 신고목록화면 } from './pages/report-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-167',
  name: '「해결로 표시」를 누르면 「신고」 목록으로 돌아가고 「신고를 잘 해결했습니다!」가 보인다',
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
  const 목록 = new 신고목록화면(page);
  let 신고들: 만든신고[] = [];
  let 번호 = '';
  let 사유 = '';

  try {
    await test.step('신고자 qa_user1 로 qa_user2 신고를 만든다', async () => {
      신고들 = await 신고들만들기(page, params.userId, params.userPassword, 1, { 게시물: '없음' });
      번호 = 신고들[0]?.번호 ?? '';
      사유 = 신고들[0]?.사유 ?? '';
    });

    await test.step('Owner 계정으로 로그인해 그 신고 상세를 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 신고.열기(번호);
      await verify('케이스가 만든 qa_user2 신고가 있다', await 신고.해결로표시.isVisible(), true, { blocker: true });
    });

    await test.step('신고 상세에서 「해결로 표시」를 누른다', async () => {
      await 신고.해결하기();
      const 목록열림 = await verify('「신고」 목록으로 돌아간다', await 목록.제목.isVisible(), true);
      const 안내 = await verify('「신고를 잘 해결했습니다!」가 보인다', await 목록.알림.글('신고를 잘 해결했습니다!').isVisible(), true);
      await verify('「해결로 표시」를 누르면 「신고」 목록으로 돌아가고 「신고를 잘 해결했습니다!」가 보인다', 목록열림 && 안내, true);
    });

    await test.step('해결한 신고 상세에서 「미해결로 표시」를 누른다', async () => {
      await 신고.열기(번호);
      await 신고.미해결로되돌리기();
      await 목록.열기();
      await verify('「미해결로 표시」한 신고는 다시 미해결 목록에 보인다', await 목록.사유링크(사유).isVisible(), true);
    });

    await test.step('신고 상세 참고사항에 글을 적고 「참고사항 기재 및 종결」을 누른다', async () => {
      await 신고.열기(번호);
      await 신고.참고사항으로종결('MTO 시험 참고사항');
      await 목록.열기('resolved=1');
      await verify('「참고사항 기재 및 종결」로 닫은 신고는 해결 목록에 보인다', await 목록.사유링크(사유).isVisible(), true);
    });
  } finally {
    await 신고정리(page, 신고들.map((항목) => 항목.번호), params.loginId, params.loginPassword, false);
  }
});
