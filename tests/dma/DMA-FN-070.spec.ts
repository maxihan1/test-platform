import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-070',
  name: '「로그인」을 누른 직후 「로그인」 버튼이 눌리지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면이 열렸는지 확인한다', async () => {
    await verify('로그인 화면이 보인다', await 로그인.열려있나(), true, { blocker: true });
  });

  await test.step('아이디와 비밀번호를 적고 「로그인」을 누른다', async () => {
    await 로그인.아이디적기(params.loginId ?? '');
    await 로그인.비밀번호적기(params.loginPassword ?? '');
    await 로그인.로그인누르기();
    const 눌림 = await 로그인.로그인버튼.isEnabled().catch(() => true);
    await verify('「로그인」을 누른 직후 「로그인」 버튼이 눌리지 않는다', 눌림, false);
  }, { capture: true });
});
