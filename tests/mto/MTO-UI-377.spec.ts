import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 만든신고, 신고들만들기, 신고정리 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 신고상세화면 } from './pages/report-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-377',
  name: '신고 상세 「신고된 컨텐츠」에 「게시물 (N)」 묶음과 「신고에 더 추가하기」 · 「신고에서 제거」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '게시물이 든 미해결 케이스 신고가 있다'],
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
      await verify('게시물이 든 미해결 케이스 신고가 있다', await 신고.게시물묶음.isVisible(), true, { blocker: true });
    });

    await test.step('그 신고 상세를 연다', async () => {
      await 신고.열기(번호);
      const 묶음 = await verify('「게시물 (N)」 묶음이 보인다', await 신고.게시물묶음.isVisible(), true);
      const 추가 = await verify('「신고에 더 추가하기」가 보인다', await 신고.신고에더추가하기.isVisible(), true);
      const 제거 = await verify('「신고에서 제거」가 보인다', await 신고.신고에서제거.isVisible(), true);
      await verify('신고 상세 「신고된 컨텐츠」에 「게시물 (N)」 묶음과 「신고에 더 추가하기」 · 「신고에서 제거」가 보인다', 묶음 && 추가 && 제거, true);
    });
  } finally {
    await 신고정리(page, 신고들.map((항목) => 항목.번호), params.loginId, params.loginPassword, false);
  }
});
