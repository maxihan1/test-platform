import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKA-FN-344',
  name: '로그인하는 동안 「로그인」 버튼이 눌리지 않는다',
  platforms: ['android'],
  precondition: ['앱이 새로 켜졌다'],
  held: '보류 — 앱이 부르는 로그인 응답을 늦출 길이 없다',
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 로그인 = new 로그인화면(driver);

  await test.step('로그인 화면을 확인한다', async () => {
    await 로그인.제목나올때까지();
    await verify('로그인 화면이 보인다', await 로그인.보이는가(), true, { blocker: true });
  });

  await test.step('일반 회원으로 로그인하며 「로그인」을 누른 직후 버튼을 확인한다', async () => {
    await 로그인.로그인(params.loginId ?? '', params.loginPassword ?? '');
    await verify('로그인하는 동안 「로그인」 버튼이 눌리지 않는다', await 로그인.로그인버튼눌리나(), false);
  });
});
