import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 도메인차단만들기, 도메인차단지우기, 시험도메인 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 서버상세화면 } from './pages/instance-detail.page.js';
import { 연합화면 } from './pages/instances.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-385',
  name: '차단한 도메인의 서버 상세에 「콘텐츠 정책」 「도메인 차단 수정」 · 「도메인 차단 취소」, 「최근 감사 기록」, 「중재 참고사항」, 「가용성」이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 차단한 도메인이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 연합 = new 연합화면(page);
  const 상세 = new 서버상세화면(page);
  const 도메인 = 시험도메인();

  try {
    await test.step('Owner 계정으로 로그인하고 도메인을 차단한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 도메인차단만들기(page, 도메인, '제한');
      await 연합.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 연합.제목.isVisible(), true, { blocker: true });
      await verify('케이스가 차단한 도메인이 있다', await 연합.줄(도메인).isVisible(), true, { blocker: true });
    });

    await test.step('그 서버 상세를 연다', async () => {
      await 상세.열기(도메인);
      const 정책 = await verify('「콘텐츠 정책」이 보인다', await 상세.콘텐츠정책.isVisible(), true);
      const 수정 = await verify('「도메인 차단 수정」이 보인다', await 상세.도메인차단수정.isVisible(), true);
      const 취소 = await verify('「도메인 차단 취소」가 보인다', await 상세.도메인차단취소.isVisible(), true);
      const 감사 = await verify('「최근 감사 기록」이 보인다', await 상세.최근감사기록.isVisible(), true);
      const 참고 = await verify('「중재 참고사항」이 보인다', await 상세.중재참고사항.isVisible(), true);
      const 가용 = await verify('「가용성」이 보인다', await 상세.가용성.isVisible(), true);
      await verify('차단한 도메인의 서버 상세에 「콘텐츠 정책」 「도메인 차단 수정」 · 「도메인 차단 취소」, 「최근 감사 기록」, 「중재 참고사항」, 「가용성」이 보인다', 정책 && 수정 && 취소 && 감사 && 참고 && 가용, true);
    });
  } finally {
    await 도메인차단지우기(page, 도메인);
  }
});
