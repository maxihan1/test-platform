import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값, API로그인, 내정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 회원정보수정화면 } from './pages/my-profile.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-279',
  name: '회원정보 수정을 열면 비밀번호 확인 칸만 보이고 정보 칸은 보이지 않는다',
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 계정 = 계정값(params);
  const 프로필 = new 회원정보수정화면(page);

  await test.step('회원으로 로그인한다', async () => {
    await 방해막기(page);
    await API로그인(page.request, 계정.loginId, 계정.password);
  });

  await test.step('회원으로 로그인했는지 확인한다', async () => {
    await verify('로그인한 회원 세션이 있다', (await 내정보(page.request)).loginId === 계정.loginId, true, { blocker: true });
  });

  await test.step('마이페이지 회원정보 수정을 연다', async () => {
    await 프로필.열기();
    await verify('회원정보 수정을 열면 비밀번호 확인 칸만 보이고 정보 칸은 보이지 않는다', (await 프로필.비밀번호.isVisible()) && !(await 프로필.이름.isVisible()), true);
  });
});
