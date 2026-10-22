import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-055',
  name: '아이디 입력칸에 앞뒤에 공백을 붙인 「user1」을 적으면 「user1」만 들어간다',
  platforms: ['android'],
  precondition: ['앱을 켜 로그인 화면에 있다'],
  params: z.object({
    아이디: z.string().min(1).describe('적을 아이디 — 앞뒤에 공백이 없는 글자').default('user1'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면이 떴는지 확인한다', async () => {
    await verify('로그인 화면이 떠 있다', await 로그인.로그인버튼보일때까지(), true, { blocker: true });
  });

  await test.step('아이디 입력칸에 앞뒤에 공백을 붙인 「user1」을 적는다', async () => {
    await 로그인.아이디적기(`  ${params.아이디}  `);
    await verify('아이디 입력칸에 앞뒤에 공백을 붙인 「user1」을 적으면 「user1」만 들어간다', await 로그인.아이디값(), params.아이디);
  }, { capture: true });
});
