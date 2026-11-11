import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 만든신고, 신고들만들기, 신고정리 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 신고상세화면 } from './pages/report-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-160',
  name: '게시물이 없는 신고 상세를 열면 「컨텐츠 삭제」가 눌리지 않고 「이 신고는 삭제할 관련 게시물이 없습니다」가 붙어 있다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '게시물 없이 계정만 신고한 케이스 신고가 있다'],
  techniques: ['결정 테이블'],
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
      await verify('게시물 없이 계정만 신고한 케이스 신고가 있다', await 신고.해결로표시.isVisible(), true, { blocker: true });
    });

    await test.step('그 신고 상세를 연다', async () => {
      await 신고.열기(번호);
      await 신고.조치영역.waitFor();
      const 눌림없음 = await verify('「컨텐츠 삭제」는 눌리지 않는다', await 신고.컨텐츠삭제.isDisabled(), true);
      const 안내 = await verify('「이 신고는 삭제할 관련 게시물이 없습니다」가 붙어 있다', await 신고.삭제불가안내.isVisible(), true);
      await verify('게시물이 없는 신고 상세를 열면 「컨텐츠 삭제」가 눌리지 않고 「이 신고는 삭제할 관련 게시물이 없습니다」가 붙어 있다', 눌림없음 && 안내, true);
    });
  } finally {
    await 신고정리(page, 신고들.map((항목) => 항목.번호), params.loginId, params.loginPassword, false);
  }
});
