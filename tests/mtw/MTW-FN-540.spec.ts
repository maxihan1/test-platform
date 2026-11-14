import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내계정API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-540',
  name: '내 프로필을 열면 「개인 메모 (나에게만 보입니다)」가 없다',
  techniques: ['동등 분할'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  let 내아이디 = '';

  await test.step('일반 회원으로 로그인하고 내 아이디를 확인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    내아이디 = (await 내계정API(page)).acct;
    await verify('내 아이디가 확인된다', 내아이디 !== '', true, { blocker: true });
  });

  await test.step('내 프로필을 연다', async () => {
    await 프로필.열기(내아이디);
    await verify('프로필에 「프로필 편집」 링크가 보인다', await 프로필.프로필편집링크.isVisible(), true, { blocker: true });
    await verify('내 프로필을 열면 「개인 메모 (나에게만 보입니다)」가 없다', await 프로필.개인메모제목.isVisible(), false);
  });
});
