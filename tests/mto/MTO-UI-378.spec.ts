import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 만든신고, 신고들만들기, 신고정리 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 신고상세화면 } from './pages/report-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-378',
  name: '미해결 신고 상세에 「작업으로 건너뛰기」와 「해결로 표시」 · 「민감함으로 설정」 · 「컨텐츠 삭제」 · 「제한」 · 「정지」 · 「사용자 지정」이 보인다',
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
  let 신고들: 만든신고[] = [];
  let 번호 = '';

  try {
    await test.step('신고자 qa_user1 로 qa_user2 신고를 만든다', async () => {
      신고들 = await 신고들만들기(page, params.userId, params.userPassword, 1, {});
      번호 = 신고들[0]?.번호 ?? '';
    });

    await test.step('Owner 계정으로 로그인해 그 신고 상세를 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 신고.열기(번호);
      await verify('케이스가 만든 qa_user2 신고가 있다', await 신고.해결로표시.isVisible(), true, { blocker: true });
    });

    await test.step('미해결 신고 상세를 연다', async () => {
      await 신고.열기(번호);
      const 건너뛰기 = await verify('「작업으로 건너뛰기」가 보인다', await 신고.작업으로건너뛰기.isVisible(), true);
      const 해결 = await verify('「해결로 표시」가 보인다', await 신고.조치해결로표시.isVisible(), true);
      const 민감함 = await verify('「민감함으로 설정」이 보인다', await 신고.민감함으로설정.isVisible(), true);
      const 삭제 = await verify('「컨텐츠 삭제」가 보인다', await 신고.컨텐츠삭제.isVisible(), true);
      const 제한 = await verify('「제한」이 보인다', await 신고.제한.isVisible(), true);
      const 정지 = await verify('「정지」가 보인다', await 신고.정지.isVisible(), true);
      const 지정 = await verify('「사용자 지정」이 보인다', await 신고.사용자지정.isVisible(), true);
      await verify('미해결 신고 상세에 「작업으로 건너뛰기」와 「해결로 표시」 · 「민감함으로 설정」 · 「컨텐츠 삭제」 · 「제한」 · 「정지」 · 「사용자 지정」이 보인다', 건너뛰기 && 해결 && 민감함 && 삭제 && 제한 && 정지 && 지정, true);
    });
  } finally {
    await 신고정리(page, 신고들.map((항목) => 항목.번호), params.loginId, params.loginPassword, false);
  }
});
