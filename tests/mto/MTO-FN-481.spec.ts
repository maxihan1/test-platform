import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 도메인차단지우기, 시험도메인 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 도메인차단확인화면 } from './pages/domain-block-confirm.page.js';
import { 도메인차단폼화면 } from './pages/domain-block-new.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-481',
  name: '심각도 「정지」로 「차단 추가」를 누르면 「<도메인> 도메인 차단 확인」 화면에 「이 서버들과의 교신이 중지될 것입니다.」와 「정지」 버튼이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 폼 = new 도메인차단폼화면(page);
  const 확인 = new 도메인차단확인화면(page);
  const 도메인 = 시험도메인();

  try {
    await test.step('Owner 계정으로 로그인하고 도메인 차단 폼을 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 폼.열기();
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 폼.제목.isVisible(), true, { blocker: true });
    });

    await test.step('도메인 차단 폼에 새 도메인을 적고 심각도 「정지」로 「차단 추가」를 누른다', async () => {
      await 폼.차단하기(도메인, '정지');
      const 제목 = await verify('「<도메인> 도메인 차단 확인」 화면이 보인다', await 확인.제목(도메인).waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
      const 안내 = await verify('「이 서버들과의 교신이 중지될 것입니다.」가 보인다', await 확인.교신중지안내.isVisible(), true);
      const 정지 = await verify('「정지」 버튼이 보인다', await 확인.정지.isVisible(), true);
      await verify('심각도 「정지」로 「차단 추가」를 누르면 「<도메인> 도메인 차단 확인」 화면에 「이 서버들과의 교신이 중지될 것입니다.」와 「정지」 버튼이 보인다', 제목 && 안내 && 정지, true);
    });
  } finally {
    await 도메인차단지우기(page, 도메인);
  }
});
