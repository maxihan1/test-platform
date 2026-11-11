import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 만든신고, 신고들만들기, 신고정리 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 신고상세화면 } from './pages/report-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-376',
  name: '미해결 신고 상세 「카테고리」에 「기타」 · 「스팸」 · 「법적인 문제」 · 「콘텐츠가 한 개 이상의 서버 규칙을 위반합니다」가 보인다',
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
      신고들 = await 신고들만들기(page, params.userId, params.userPassword, 1, { 게시물: '없음' });
      번호 = 신고들[0]?.번호 ?? '';
    });

    await test.step('Owner 계정으로 로그인해 그 신고 상세를 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 신고.열기(번호);
      await verify('케이스가 만든 qa_user2 신고가 있다', await 신고.해결로표시.isVisible(), true, { blocker: true });
    });

    await test.step('미해결 신고 상세를 연다', async () => {
      await 신고.열기(번호);
      const 기타 = await verify('「기타」가 보인다', await 신고.카테고리('기타').isVisible(), true);
      const 스팸 = await verify('「스팸」이 보인다', await 신고.카테고리('스팸').isVisible(), true);
      const 법적 = await verify('「법적인 문제」가 보인다', await 신고.카테고리('법적인 문제').isVisible(), true);
      const 규칙 = await verify('「콘텐츠가 한 개 이상의 서버 규칙을 위반합니다」가 보인다', await 신고.카테고리('콘텐츠가 한 개 이상의 서버 규칙을 위반합니다').isVisible(), true);
      await verify('미해결 신고 상세 「카테고리」에 「기타」 · 「스팸」 · 「법적인 문제」 · 「콘텐츠가 한 개 이상의 서버 규칙을 위반합니다」가 보인다', 기타 && 스팸 && 법적 && 규칙, true);
    });
  } finally {
    await 신고정리(page, 신고들.map((항목) => 항목.번호), params.loginId, params.loginPassword, false);
  }
});
