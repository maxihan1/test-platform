import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 신고목록화면 } from './pages/report-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-116',
  name: '신고 목록 화면에 「미해결」 · 「해결」, 「전체」 · 「로컬」 · 「리모트」 필터와 「신고된 계정의 도메인」 칸 · 「검색」 · 「초기화」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 신고목록화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「신고」 화면을 연다', async () => {
    await 목록.열기();
    const 미해결 = await verify('「미해결」 필터가 보인다', await 목록.미해결.isVisible(), true);
    const 해결 = await verify('「해결」 필터가 보인다', await 목록.해결.isVisible(), true);
    const 전체 = await verify('「전체」 필터가 보인다', await 목록.전체.isVisible(), true);
    const 로컬 = await verify('「로컬」 필터가 보인다', await 목록.로컬.isVisible(), true);
    const 리모트 = await verify('「리모트」 필터가 보인다', await 목록.리모트.isVisible(), true);
    const 도메인 = await verify('「신고된 계정의 도메인」 칸이 보인다', await 목록.도메인칸.isVisible(), true);
    const 검색 = await verify('「검색」 버튼이 보인다', await 목록.검색.isVisible(), true);
    const 초기화 = await verify('「초기화」 링크가 보인다', await 목록.초기화.isVisible(), true);
    await verify('신고 목록 화면에 「미해결」 · 「해결」, 「전체」 · 「로컬」 · 「리모트」 필터와 「신고된 계정의 도메인」 칸 · 「검색」 · 「초기화」가 보인다', 미해결 && 해결 && 전체 && 로컬 && 리모트 && 도메인 && 검색 && 초기화, true);
  });
});
