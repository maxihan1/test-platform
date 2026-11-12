import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 도메인차단폼화면 } from './pages/domain-block-new.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-214',
  name: '도메인 차단 폼에 「not a domain」을 적고 「차단 추가」를 누르면 「올바른 도메인 네임이 아닙니다」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    차단도메인입력: z.string().min(1).describe('도메인 칸에 적을 글자 — 도메인 형식이 아닌 글자').default('not a domain'),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 폼 = new 도메인차단폼화면(page);

  await test.step('Owner 계정으로 로그인하고 도메인 차단 폼을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 폼.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 폼.제목.isVisible(), true, { blocker: true });
  });

  await test.step('도메인 차단 폼 「도메인」에 「not a domain」을 적고 「차단 추가」를 누른다', async () => {
    await 폼.차단하기(params.차단도메인입력);
    await verify('도메인 차단 폼에 「not a domain」을 적고 「차단 추가」를 누르면 「올바른 도메인 네임이 아닙니다」가 보인다', await 폼.도메인오류.isVisible(), true);
  });
});
