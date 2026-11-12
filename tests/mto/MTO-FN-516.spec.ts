import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 조치화면 } from './pages/account-action.page.js';
import { 관리화면 } from './pages/admin.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-516',
  name: 'Moderator 가 Owner 계정에 「조치 취하기」를 누르면 「이 페이지를 표시할 권한이 없습니다.」가 보인다',
  precondition: ['Moderator(qa_mod) 계정으로 로그인해 있다'],
  params: z.object({
    modId: z.string().describe('Moderator 아이디').optional().meta({ secret: true, account: '중재자' }),
    modPassword: z.string().describe('Moderator 비밀번호').optional().meta({ secret: true, account: '중재자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 조치 = new 조치화면(page);
  const 관리 = new 관리화면(page);

  await test.step('Moderator 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.modId, params.modPassword);
    await verify('Moderator(qa_mod) 계정으로 로그인해 있다', new 로그인화면(page).로그인화면인가(), false, { blocker: true });
  });

  await test.step('qa_admin 조치 화면에서 「경고 보내기」로 「조치 취하기」를 누른다', async () => {
    await 조치.열기(await 계정번호(page, 'qa_admin'));
    await 조치.조치하기('경고 보내기', false);
    await verify('Moderator 가 Owner 계정에 「조치 취하기」를 누르면 「이 페이지를 표시할 권한이 없습니다.」가 보인다', await 관리.오류.권한없음.waitFor({ timeout: 10_000 }).then(() => true, () => false), true);
  });
});
