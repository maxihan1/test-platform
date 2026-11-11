import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 도메인차단만들기, 도메인차단지우기, 시험도메인 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 서버상세화면 } from './pages/instance-detail.page.js';
import { 연합화면 } from './pages/instances.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-208',
  name: 'Owner 가 연합 목록의 도메인 줄을 누르면 제목이 그 도메인인 서버 상세가 열린다',
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

    await test.step('「연합」 목록에서 그 도메인 줄을 누른다', async () => {
      await 연합.줄(도메인).click();
      await verify('Owner 가 연합 목록의 도메인 줄을 누르면 제목이 그 도메인인 서버 상세가 열린다', await 상세.제목(도메인).waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
    });
  } finally {
    await 도메인차단지우기(page, 도메인);
  }
});
