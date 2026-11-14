import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 작성화면 } from './pages/publish.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-385',
  name: '작성 상자 본문에 「@hana」를 넣으면 계정 자동완성에 hana_photo 가 뜬다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
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

  await test.step('작성 상자 본문에 「@hana」를 넣는다', async () => {
    await 홈.작성.쓰기('@hana');
    const 떴다 = await 글쓰기.자동완성항목(/@hana_photo/).waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('작성 상자 본문에 「@hana」를 넣으면 계정 자동완성에 hana_photo 가 뜬다', 떴다, true);
  });

  await test.step('작성 상자 본문에 「#오늘」을 넣는다', async () => {
    await 홈.작성.쓰기('#오늘');
    const 떴다 = await 글쓰기.자동완성항목(/^#오늘/).first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('「#오늘」에는 해시태그 자동완성이 뜬다', 떴다, true);
  });

  await test.step('작성 상자 본문에 「:seed」를 넣는다', async () => {
    await 홈.작성.쓰기(':seed');
    const 떴다 = await 글쓰기.자동완성항목(/:seed_/).first().waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('「:seed」에는 사용자 정의 에모지 자동완성이 뜬다', 떴다, true);
  });
});
