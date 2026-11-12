import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 도메인차단만들기, 도메인차단지우기, 시험도메인 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 연합화면 } from './pages/instances.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-221',
  name: '「내보내기」를 누르면 받은 CSV 파일에 케이스가 차단한 도메인 줄이 들어 있다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 차단한 도메인이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 연합 = new 연합화면(page);
  const 도메인 = 시험도메인();

  try {
    await test.step('Owner 계정으로 로그인하고 도메인을 차단한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 도메인차단만들기(page, 도메인, '제한');
      await 연합.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 연합.제목.isVisible(), true, { blocker: true });
      await verify('케이스가 차단한 도메인이 있다', await 연합.줄(도메인).isVisible(), true, { blocker: true });
    });

    await test.step('「연합」 화면에서 「내보내기」를 누른다', async () => {
      const 파일글 = await 연합.내보내기받기();
      await verify('「내보내기」를 누르면 받은 CSV 파일에 케이스가 차단한 도메인 줄이 들어 있다', 파일글.split('\n').some((줄) => 줄.startsWith(`${도메인},`)), true);
    });
  } finally {
    await 도메인차단지우기(page, 도메인);
  }
});
