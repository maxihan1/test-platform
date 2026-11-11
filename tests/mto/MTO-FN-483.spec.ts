import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 도메인차단만들기, 도메인차단지우기, 시험도메인 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 도메인차단폼화면 } from './pages/domain-block-new.page.js';
import { 연합화면 } from './pages/instances.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-483',
  name: '「제한」이 걸린 도메인에 「없음」 차단을 더하면 「이미 <도메인>에 대한 더 강력한 제한이 걸려 있습니다, 차단 해제를 먼저 해야 합니다」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 「제한」으로 차단한 도메인이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 연합 = new 연합화면(page);
  const 폼 = new 도메인차단폼화면(page);
  const 도메인 = 시험도메인();

  try {
    await test.step('Owner 계정으로 로그인하고 도메인을 「제한」으로 차단한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 도메인차단만들기(page, 도메인, '제한');
      await 연합.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 연합.제목.isVisible(), true, { blocker: true });
      await verify('케이스가 「제한」으로 차단한 도메인이 있다', await 연합.줄정책(도메인, '제한').isVisible(), true, { blocker: true });
    });

    await test.step('같은 도메인을 심각도 「없음」으로 다시 「차단 추가」한다', async () => {
      await 폼.열기();
      await 폼.차단하기(도메인, '없음');
      await verify('「제한」이 걸린 도메인에 「없음」 차단을 더하면 「이미 <도메인>에 대한 더 강력한 제한이 걸려 있습니다, 차단 해제를 먼저 해야 합니다」가 보인다', await 폼.더강한제한안내(도메인).isVisible(), true);
    });
  } finally {
    await 도메인차단지우기(page, 도메인);
  }
});
