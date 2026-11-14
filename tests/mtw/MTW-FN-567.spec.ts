import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내계정API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-567',
  name: '내 프로필 「⋯」를 누르면 「계정 신고」가 보이지 않는다',
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

  await test.step('일반 회원으로 로그인하고 내 프로필을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    내아이디 = (await 내계정API(page)).acct;
    await 프로필.열기(내아이디);
    await verify('프로필 머리에 「프로필 편집」 링크가 보인다', await 프로필.프로필편집링크.isVisible(), true, { blocker: true });
  });

  await test.step('내 프로필의 「⋯」를 누른다', async () => {
    if (await 프로필.더보기.first().waitFor({ timeout: 5_000 }).then(() => true, () => false)) await 프로필.더보기열기();
    await verify('내 프로필 「⋯」를 누르면 「계정 신고」가 보이지 않는다', await 프로필.펼침.항목(/^계정 신고$/).isVisible(), false);
  });
});
