import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-055',
  name: '아이디 입력칸에 앞뒤 공백을 붙여 적으면 공백을 뺀 글자만 남는다',
  platforms: ['android'],
  precondition: ['앱이 로그인 화면에 있다'],
  params: z.object({
    아이디: z.string().describe('앞뒤에 공백을 붙인 아이디 — 가운데에는 공백이 없는 글자').default('  mka  '),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 화면 = new 로그인화면(driver);

  await test.step('로그인 화면이 열렸는지 확인한다', async () => {
    await verify('로그인 화면이 보인다', await 화면.열릴때까지(), true, { blocker: true });
  });

  await test.step(
    '아이디 입력칸에 앞뒤 공백을 붙인 「  mka  」를 적는다',
    async () => {
      await 화면.아이디적기(params.아이디);
      await verify(
        '아이디 입력칸에 앞뒤 공백을 붙여 적으면 공백을 뺀 글자만 남는다',
        await 화면.아이디칸.getText(),
        params.아이디.trim(),
      );
    },
    { capture: true },
  );
});
