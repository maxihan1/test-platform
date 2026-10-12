import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값, 로그인한아이디, 테스트계정으로로그인 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원탈퇴화면 } from './pages/my-withdraw.page.js';
import { 경로 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-UI-124',
  name: '회원 탈퇴 화면에 「탈퇴 전에 꼭 확인하세요」가 보인다',
  precondition: ['테스트 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 탈퇴화면 = new 회원탈퇴화면(page);

  await test.step('테스트 계정으로 로그인한다', async () => {
    await 방해막기(page);
    await 테스트계정으로로그인(page.request, params);
  });

  await test.step('테스트 계정으로 로그인했는지 확인한다', async () => {
    await verify('테스트 계정으로 로그인해 있다', await 로그인한아이디(page.request), 계정값(params).loginId, { blocker: true });
  });

  await test.step('회원 탈퇴 화면을 연다', async () => {
    await 탈퇴화면.열기();
    await 탈퇴화면.제목.waitFor();
    await verify('회원 탈퇴 화면이 열려 있다', 경로(page), 회원탈퇴화면.주소, { blocker: true });
    await verify('회원 탈퇴 화면에 「탈퇴 전에 꼭 확인하세요」가 보인다', await 탈퇴화면.안내제목.isVisible(), true);
  });
});
