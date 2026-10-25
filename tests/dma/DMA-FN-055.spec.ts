import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-055',
  name: '「아이디」 입력칸에 앞뒤 공백을 붙여 적으면 공백 없이 「dmauser」만 들어간다',
  platforms: ['android'],
  precondition: ['앱을 새로 깔아 처음 켠 상태다'],
  params: z.object({
    아이디: z.string().describe('앞뒤 공백을 붙여 적을 아이디 — 가운데에 공백이 없는 글자').default('dmauser'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면이 열렸는지 확인한다', async () => {
    await verify('로그인 화면이 보인다', await 로그인.열려있나(), true, { blocker: true });
  });

  await test.step('「아이디」 입력칸에 앞뒤 공백을 붙여 「dmauser」를 적는다', async () => {
    await 로그인.아이디적기(`  ${params.아이디}  `);
    await verify(
      '「아이디」 입력칸에 앞뒤 공백을 붙여 적으면 공백 없이 「dmauser」만 들어간다',
      await 로그인.아이디칸.getText(),
      params.아이디,
    );
  });
});
