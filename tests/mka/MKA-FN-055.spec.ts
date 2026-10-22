import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-055',
  name: '「아이디」에 앞뒤 공백을 붙여 적으면 공백 없이 「demo」로 적힌다',
  platforms: ['android'],
  precondition: ['앱이 새로 켜졌다'],
  params: z.object({
    아이디: z.string().describe('아이디 칸에 적을 글자 — 공백 없는 영문 소문자와 숫자').default('demo'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면을 확인한다', async () => {
    await 로그인.제목나올때까지();
    await verify('로그인 화면이 보인다', await 로그인.보이는가(), true, { blocker: true });
  });

  await test.step('「아이디」에 앞뒤 공백을 붙여 「demo」를 적는다', async () => {
    await 로그인.아이디적기(` ${params.아이디} `);
    await 로그인.아이디칸에글나올때까지();
    await verify('「아이디」에 앞뒤 공백을 붙여 적으면 공백 없이 「demo」로 적힌다', await 로그인.아이디칸글(), params.아이디);
  });
});
