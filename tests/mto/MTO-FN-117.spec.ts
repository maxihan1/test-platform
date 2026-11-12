import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 만든신고, 신고들만들기, 신고정리 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 조치화면 } from './pages/account-action.page.js';
import { 신고상세화면 } from './pages/report-detail.page.js';
import { 신고목록화면 } from './pages/report-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-117',
  name: '신고에서 들어와 조치를 마치면 「신고」 목록으로 가고 「신고 #N가 정상적으로 처리되었습니다」가 보인다',
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
  const 조치 = new 조치화면(page);
  const 목록 = new 신고목록화면(page);
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

    await test.step('신고 상세의 「사용자 지정」에서 「경고 보내기」로 「조치 취하기」를 누른다', async () => {
      await 신고.사용자지정.click();
      await 조치.그려질때까지();
      await 조치.조치하기('경고 보내기', false);
      const 목록열림 = await verify('「신고」 목록으로 간다', await 목록.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
      const 안내 = await verify('「신고 #N가 정상적으로 처리되었습니다」가 보인다', await 목록.알림.글(`신고 #${번호}가 정상적으로 처리되었습니다`).waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
      await verify('신고에서 들어와 조치를 마치면 「신고」 목록으로 가고 「신고 #N가 정상적으로 처리되었습니다」가 보인다', 목록열림 && 안내, true);
    });
  } finally {
    await 신고정리(page, 신고들.map((항목) => 항목.번호), params.loginId, params.loginPassword, false);
  }
});
