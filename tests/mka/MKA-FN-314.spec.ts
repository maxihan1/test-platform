import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-314',
  name: '「로그인」을 누른 뒤 로그인하는 동안 「로그인」 버튼이 눌리지 않는다',
  platforms: ['android'],
  held: '보류 — 앱 응답을 늦출 길이 없어 로그인하는 동안의 상태를 잡지 못한다',
  precondition: ['회원 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 화면 = new 로그인화면(driver);

  await test.step('로그인 화면이 열렸는지 확인한다', async () => {
    await verify('로그인 화면이 보인다', await 화면.열릴때까지(), true, { blocker: true });
  });

  await test.step('회원 계정을 적고 「로그인」을 누른다', async () => {
    await 화면.로그인(params.loginId ?? '', params.password ?? '');
    await verify(
      '「로그인」을 누른 뒤 로그인하는 동안 「로그인」 버튼이 눌리지 않는다',
      await 화면.로그인버튼틀.isEnabled(),
      false,
    );
  });
});
