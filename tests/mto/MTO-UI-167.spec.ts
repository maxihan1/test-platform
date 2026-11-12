import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 연합화면 } from './pages/instances.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-167',
  name: '연합 화면에 「도메인 차단 추가하기」 · 「내보내기」 · 「불러오기」와 「모두」 · 「제한」, 「전체」 · 「실패중」 · 「사용불가」 필터, 「도메인」 칸이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 연합 = new 연합화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 연합.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 연합.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「연합」 화면을 연다', async () => {
    await 연합.열기();
    const 추가 = await verify('「도메인 차단 추가하기」가 보인다', await 연합.도메인차단추가하기.isVisible(), true);
    const 내보내기 = await verify('「내보내기」가 보인다', await 연합.내보내기.isVisible(), true);
    const 불러오기 = await verify('「불러오기」가 보인다', await 연합.불러오기.isVisible(), true);
    const 모두 = await verify('「모두」 필터가 보인다', await 연합.모두.isVisible(), true);
    const 제한 = await verify('「제한」 필터가 보인다', await 연합.제한.isVisible(), true);
    const 전체 = await verify('「전체」 필터가 보인다', await 연합.전체.isVisible(), true);
    const 실패중 = await verify('「실패중」 필터가 보인다', await 연합.실패중.isVisible(), true);
    const 사용불가 = await verify('「사용불가」 필터가 보인다', await 연합.사용불가.isVisible(), true);
    const 도메인 = await verify('「도메인」 칸이 보인다', await 연합.도메인칸.isVisible(), true);
    await verify('연합 화면에 「도메인 차단 추가하기」 · 「내보내기」 · 「불러오기」와 「모두」 · 「제한」, 「전체」 · 「실패중」 · 「사용불가」 필터, 「도메인」 칸이 보인다', 추가 && 내보내기 && 불러오기 && 모두 && 제한 && 전체 && 실패중 && 사용불가 && 도메인, true);
  });
});
