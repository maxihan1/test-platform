import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값 } from './helpers/account.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-314',
  name: '「로그인」을 누르면 로그인하는 동안 「로그인」 버튼이 눌리지 않는다',
  platforms: ['android'],
  precondition: ['앱을 켜 로그인 화면에 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 앱의 로그인 응답을 늦출 방법이 없다',
});

test(spec, async ({ driver, params }) => {
  const 계정 = 계정값(params);
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면이 떴는지 확인한다', async () => {
    await verify('로그인 화면이 떠 있다', await 로그인.로그인버튼보일때까지(), true, { blocker: true });
  });

  await test.step('일반 회원 아이디와 비밀번호를 적고 「로그인」을 누른다', async () => {
    await 로그인.로그인(계정.loginId, 계정.password);
    await verify('「로그인」을 누르면 로그인하는 동안 「로그인」 버튼이 눌리지 않는다', await 로그인.로그인버튼눌림(), 'false');
  }, { capture: true });
});
