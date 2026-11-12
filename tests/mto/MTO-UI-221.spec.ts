import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 공개프로필화면 } from './pages/settings-profile.page.js';
import { 유행링크화면 } from './pages/trends-links.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-221',
  name: '유행하는 링크 화면에 「링크 허용」 · 「발행처 허용」 · 「링크 금지」 · 「발행처 비허용」과 「발행처」 링크가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 공개프로필화면(page);
  const 유행링크 = new 유행링크화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 프로필.로그아웃.waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });
  await test.step('「유행하는 링크」 화면을 연다', async () => {
    await 유행링크.열기();
    const 링크허용 = await verify('「링크 허용」이 보인다', await 유행링크.링크허용.isVisible(), true);
    const 발행처허용 = await verify('「발행처 허용」이 보인다', await 유행링크.발행처허용.isVisible(), true);
    const 링크금지 = await verify('「링크 금지」가 보인다', await 유행링크.링크금지.isVisible(), true);
    const 발행처비허용 = await verify('「발행처 비허용」이 보인다', await 유행링크.발행처비허용.isVisible(), true);
    const 발행처 = await verify('「발행처」 링크가 보인다', await 유행링크.발행처.isVisible(), true);
    await verify('유행하는 링크 화면에 「링크 허용」 · 「발행처 허용」 · 「링크 금지」 · 「발행처 비허용」과 「발행처」 링크가 보인다', 링크허용 && 발행처허용 && 링크금지 && 발행처비허용 && 발행처, true);
  });
});
