import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 도메인차단만들기, 도메인차단지우기, 시험도메인 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 도메인차단폼화면 } from './pages/domain-block-new.page.js';
import { 서버상세화면 } from './pages/instance-detail.page.js';
import { 연합화면 } from './pages/instances.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-219',
  name: '「없음」 차단 도메인에 「제한」 차단을 더하면 서버 상세 정책이 「제한」으로 바뀐다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 「없음」으로 차단한 도메인이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 연합 = new 연합화면(page);
  const 폼 = new 도메인차단폼화면(page);
  const 상세 = new 서버상세화면(page);
  const 도메인 = 시험도메인();

  try {
    await test.step('Owner 계정으로 로그인하고 도메인을 「없음」으로 차단한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 도메인차단만들기(page, 도메인, '없음');
      await 연합.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 연합.제목.isVisible(), true, { blocker: true });
      await verify('케이스가 「없음」으로 차단한 도메인이 있다', await 연합.줄(도메인).isVisible(), true, { blocker: true });
    });

    await test.step('같은 도메인을 심각도 「제한」으로 다시 「차단 추가」한다', async () => {
      await 폼.열기();
      await 폼.차단하기(도메인, '제한');
      await 연합.알림.글('도메인 차단 처리를 완료했습니다').waitFor();
      await 상세.열기(도메인);
      await verify('「없음」 차단 도메인에 「제한」 차단을 더하면 서버 상세 정책이 「제한」으로 바뀐다', (await 상세.정책칸.innerText()).trim(), '제한');
    });
  } finally {
    await 도메인차단지우기(page, 도메인);
  }
});
