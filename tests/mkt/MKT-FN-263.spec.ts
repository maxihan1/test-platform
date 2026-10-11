import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내화면 } from './components/notice-screen.component.js';
import { 계정값, API로그인, 내정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';

export const spec = defineCase({
  tcId: 'MKT-FN-263',
  name: '일반 회원이 /admin 을 열면 「권한이 없습니다」 화면이 보인다',
  techniques: ['동등 분할'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 계정 = 계정값(params);
  const 안내 = new 안내화면(page);

  await test.step('회원으로 로그인한다', async () => {
    await 방해막기(page);
    await API로그인(page.request, 계정.loginId, 계정.password);
  });

  await test.step('회원으로 로그인했는지 확인한다', async () => {
    await verify('로그인한 회원 세션이 있다', (await 내정보(page.request)).loginId === 계정.loginId, true, { blocker: true });
  });

  await test.step('관리자 화면 /admin 을 연다', async () => {
    await page.goto('/admin');
    await verify('일반 회원이 /admin 을 열면 「권한이 없습니다」 화면이 보인다', await 안내.제목글('권한이 없습니다').isVisible(), true);
  });
});
