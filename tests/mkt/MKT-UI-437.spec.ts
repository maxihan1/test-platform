import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 계정값 } from './helpers/account.helper.js';
import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 개인정보처리방침화면 } from './pages/privacy.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-437',
  name: '개인정보처리방침 화면 맨 위에 제목 「개인정보처리방침」이 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    password: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 계정 = 계정값(params);
  const 방침 = new 개인정보처리방침화면(page);

  await test.step('회원으로 로그인한다', async () => {
    await API로그인(page.request, 계정.loginId, 계정.password);
  });

  await test.step('로그인한 회원인지 확인한다', async () => {
    await verify('로그인한 회원이 맞다', (await 세션아이디(page)) === 계정.loginId, true, { blocker: true });
  });

  await test.step('개인정보처리방침 화면을 연다', async () => {
    await 방해막기(page);
    await 방침.열기();
    await 방침.본문.waitFor();
    await verify('개인정보처리방침 화면 맨 위에 제목 「개인정보처리방침」이 보인다', await 방침.맨위에보이는제목(), '개인정보처리방침');
  });
});
