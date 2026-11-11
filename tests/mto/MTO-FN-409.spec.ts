import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-409',
  name: 'Owner 가 자기보다 낮은 Moderator(qa_mod) 상세를 열면 「경고」 · 「제한」 · 「정지」 조치 버튼이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', new 로그인화면(page).로그인화면인가(), false, { blocker: true });
  });

  await test.step('qa_mod 계정 상세를 연다', async () => {
    await 상세.열기(await 계정번호(page, 'qa_mod'));
    const 경고 = await verify('「경고」 조치 버튼이 보인다', await 상세.경고.isVisible(), true);
    const 제한 = await verify('「제한」 조치 버튼이 보인다', await 상세.제한.isVisible(), true);
    const 정지 = await verify('「정지」 조치 버튼이 보인다', await 상세.정지.isVisible(), true);
    await verify('Owner 가 자기보다 낮은 Moderator(qa_mod) 상세를 열면 「경고」 · 「제한」 · 「정지」 조치 버튼이 보인다', 경고 && 제한 && 정지, true);
  });
});
