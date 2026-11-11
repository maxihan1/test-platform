import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 조치화면 } from './pages/account-action.page.js';
import { 관리화면 } from './pages/admin.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-467',
  name: 'Owner 가 자기 계정(같은 우선순위)에 「조치 취하기」를 누르면 「이 페이지를 표시할 권한이 없습니다.」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 조치 = new 조치화면(page);
  const 관리 = new 관리화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', new 로그인화면(page).로그인화면인가(), false, { blocker: true });
  });

  await test.step('qa_admin 자기 계정 조치 화면에서 「경고 보내기」로 「조치 취하기」를 누른다', async () => {
    await 조치.열기(await 계정번호(page, 'qa_admin'));
    await 조치.조치하기('경고 보내기', false);
    await verify('Owner 가 자기 계정(같은 우선순위)에 「조치 취하기」를 누르면 「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 관리.오류.권한없음.waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
  });
});
