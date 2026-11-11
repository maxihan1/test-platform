import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 도메인차단지우기, 시험도메인 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 도메인차단폼화면 } from './pages/domain-block-new.page.js';
import { 연합화면 } from './pages/instances.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-215',
  name: '새 도메인을 「제한」으로 차단하면 연합 목록으로 가고 「도메인 차단 처리를 완료했습니다」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
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
    await test.step('Owner 계정으로 로그인하고 도메인 차단 폼을 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 폼.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 폼.제목.isVisible(), true, { blocker: true });
    });

    await test.step('도메인 차단 폼에 새 도메인을 적고 심각도 「제한」으로 「차단 추가」를 누른다', async () => {
      await 폼.차단하기(도메인, '제한');
      const 목록 = await verify('연합 목록으로 간다', await 연합.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
      const 안내 = await verify('「도메인 차단 처리를 완료했습니다」가 보인다', await 연합.알림.글('도메인 차단 처리를 완료했습니다').waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
      await verify('새 도메인을 「제한」으로 차단하면 연합 목록으로 가고 「도메인 차단 처리를 완료했습니다」가 보인다', 목록 && 안내, true);
    });
  } finally {
    await 도메인차단지우기(page, 도메인);
  }
});
