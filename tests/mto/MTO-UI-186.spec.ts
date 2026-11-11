import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 이메일도메인차단목록화면 } from './pages/email-domain-blocks.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-186',
  name: '차단된 이메일 도메인 화면에 「새로 추가하기」 · 「도메인」 칸 · 「검색」 · 「초기화」 · 「삭제하기」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 이메일도메인차단목록화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 목록.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「차단된 이메일 도메인」 화면을 연다', async () => {
    await 목록.열기();
    const 추가 = await verify('「새로 추가하기」가 보인다', await 목록.새로추가하기.isVisible(), true);
    const 칸 = await verify('「도메인」 칸이 보인다', await 목록.도메인칸.isVisible(), true);
    const 검색 = await verify('「검색」이 보인다', await 목록.검색.isVisible(), true);
    const 초기화 = await verify('「초기화」가 보인다', await 목록.초기화.isVisible(), true);
    const 삭제 = await verify('「삭제하기」가 보인다', await 목록.삭제하기.isVisible(), true);
    await verify('차단된 이메일 도메인 화면에 「새로 추가하기」 · 「도메인」 칸 · 「검색」 · 「초기화」 · 「삭제하기」가 보인다', 추가 && 칸 && 검색 && 초기화 && 삭제, true);
  });
});
