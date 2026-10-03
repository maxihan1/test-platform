import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인폼 } from './components/login-form.component.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';
import { 회원탈퇴화면 } from './pages/my-withdraw.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-015',
  name: '회원정보 수정의 아이디 칸은 흐리게 나오고 탈퇴 화면의 「탈퇴하기」 버튼은 체크 전에 눌리지 않는다',
  precondition: ['회원 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().min(1).describe('회원 아이디').default('user1'),
    password: z.string().min(1).describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    disabled: z.boolean().describe('고칠 수 없는지').default(true),
    enabled: z.boolean().describe('「탈퇴하기」 버튼이 눌리는지').default(false),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 수정 = new 회원정보수정화면(page);
  const 탈퇴 = new 회원탈퇴화면(page);

  await test.step('회원 계정으로 로그인한다', async () => {
    await new 로그인폼(page).로그인한다(params.loginId, params.password ?? '');
  });

  await test.step('회원정보 수정 화면에서 비밀번호를 확인하고 수정 칸을 연다', async () => {
    await 수정.열기();
    await 수정.비밀번호를확인한다(params.password ?? '');
    await verify('아이디 칸은 고칠 수 없게 흐리게 나온다', await 수정.아이디칸.isDisabled(), expected.disabled);
  });

  await test.step('회원 탈퇴 화면을 연다', async () => {
    await 탈퇴.열기();
    await verify('「위 내용을 확인했습니다」 체크박스를 체크하기 전에는 「탈퇴하기」 버튼이 눌리지 않는다', await 탈퇴.탈퇴버튼.isEnabled(), expected.enabled);
  });
});
