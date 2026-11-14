import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 작성화면 } from './pages/publish.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-341',
  name: '작성 상자 본문을 500자로 채우면 「게시」를 누를 수 있다',
  techniques: ['경계값 분석'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    한도글자수: z.number().int().min(1).max(500).describe('한도에 맞춰 넣는 글자 수 — 1 이상 500 이하').default(500),
    넘는글자수: z.number().int().min(501).max(600).describe('한도를 넘겨 넣는 글자 수 — 501 이상 600 이하').default(501),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 글쓰기 = new 작성화면(page);

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  await test.step('작성 상자 본문에 500자를 넣는다', async () => {
    await 홈.작성.쓰기('가'.repeat(params.한도글자수));
    await verify('작성 상자 본문을 500자로 채우면 「게시」를 누를 수 있다', await 글쓰기.게시버튼.isEnabled(), true);
  });

  await test.step('작성 상자 본문에 501자를 넣는다', async () => {
    await 홈.작성.쓰기('가'.repeat(params.넘는글자수));
    await verify('501자에서는 「게시」가 막힌다', await 글쓰기.게시버튼.isDisabled(), true);
  });
});
